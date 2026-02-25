import { NextResponse } from 'next/server';
import { eq, and, gte } from 'drizzle-orm';
import { getDb, rules, permits, projects, tasks, auditLog, emailDrafts } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

const JURISDICTION_CONTACTS: Record<string, { email: string; name: string }> = {
  Houston: { email: 'permits@houstontx.gov', name: 'City of Houston Permit Office' },
  'Harris County': { email: 'permits@harriscountytx.gov', name: 'Harris County Permit Office' },
  Austin: { email: 'permits@austintexas.gov', name: 'Austin Development Services' },
  Dallas: { email: 'permits@dallascityhall.com', name: 'Dallas Development Services' },
  'San Antonio': { email: 'permits@sanantonio.gov', name: 'San Antonio Development Services' },
};

// Jurisdiction average review days
const JURISDICTION_AVG: Record<string, number> = {
  Houston: 15,
  'Harris County': 20,
  Austin: 18,
  Dallas: 16,
  'San Antonio': 14,
};

function avgDays(jurisdiction: string, type: string): number {
  const base = JURISDICTION_AVG[jurisdiction] ?? 15;
  return type === 'Fire' ? base + 5 : base;
}

function daysInQueue(submittedAt: Date | null): number {
  if (!submittedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(submittedAt).getTime()) / 86_400_000));
}

function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

interface FiredRule {
  ruleName: string;
  permitName: string;
  projectName: string;
  taskTitle: string;
  priority: string;
}

// POST /api/rules/run — evaluate all enabled rules against active permits
export async function POST() {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const db = getDb();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

    // Load enabled rules and active permits in parallel
    const [enabledRules, activePermits] = await Promise.all([
      db.select().from(rules).where(eq(rules.enabled, true)),
      db
        .select({
          id: permits.id,
          name: permits.name,
          type: permits.type,
          jurisdiction: permits.jurisdiction,
          status: permits.status,
          submittedAt: permits.submittedAt,
          expiryDate: permits.expiryDate,
          hearingDate: permits.hearingDate,
          archived: permits.archived,
          projectId: permits.projectId,
          projectName: projects.name,
        })
        .from(permits)
        .leftJoin(projects, eq(permits.projectId, projects.id))
        .where(eq(permits.archived, false)),
    ]);

    // Existing auto-tasks in last 7 days — used for deduplication
    const recentAutoTasks = await db
      .select({ permitId: tasks.permitId, ruleId: tasks.ruleId })
      .from(tasks)
      .where(and(eq(tasks.type, 'auto'), gte(tasks.createdAt, sevenDaysAgo)));

    const recentSet = new Set(
      recentAutoTasks.map((t) => `${t.permitId}:${t.ruleId}`)
    );

    const fired: FiredRule[] = [];
    const newTasks: typeof tasks.$inferInsert[] = [];
    const newDrafts: typeof emailDrafts.$inferInsert[] = [];
    const auditEntries: typeof auditLog.$inferInsert[] = [];

    for (const permit of activePermits) {
      const days = daysInQueue(permit.submittedAt);
      const avg = avgDays(permit.jurisdiction, permit.type);
      const expiry = daysUntil(permit.expiryDate);
      const hearing = daysUntil(permit.hearingDate);

      for (const rule of enabledRules) {
        const dedupKey = `${permit.id}:${rule.id}`;
        if (recentSet.has(dedupKey)) continue; // already fired this week

        let shouldFire = false;
        let taskTitle = '';
        let priority = 'medium';
        let draftToCreate: typeof emailDrafts.$inferInsert | null = null;

        switch (rule.name) {
          case 'Overdue Escalation': {
            if (days > avg + 20 && !['approved', 'rejected'].includes(permit.status)) {
              shouldFire = true;
              taskTitle = `Escalate: ${permit.name} — ${days}d in queue (avg ${avg}d)`;
              priority = 'urgent';
              const c = JURISDICTION_CONTACTS[permit.jurisdiction];
              draftToCreate = {
                permitId: permit.id,
                subject: `Urgent: Permit Review Escalation - ${permit.name}`,
                body: `Dear ${c?.name ?? permit.jurisdiction + ' Permit Office'},\n\nI am writing to request an expedited review of permit application for ${permit.name} (${permit.projectName ?? ''}).\n\nThis permit has been under review for ${days} days, which exceeds the typical processing time of ${avg} days for ${permit.type} permits in ${permit.jurisdiction}.\n\nThe delay is impacting our construction schedule and causing significant carrying costs. We kindly request this application be prioritized for review.\n\nPlease let us know if any additional documentation is required.\n\nThank you,\n[Your Name]`,
                recipient: c?.email ?? null,
                recipientName: c?.name ?? null,
                templateType: 'escalation',
                createdBy: 'agent',
                status: 'pending-review',
              };
            }
            break;
          }

          case 'Slow Review Alert':
            if (days > avg && !['approved', 'rejected'].includes(permit.status)) {
              shouldFire = true;
              taskTitle = `Follow up: ${permit.name} — ${days}d exceeds ${permit.jurisdiction} avg (${avg}d)`;
              priority = 'high';
            }
            break;

          case 'Info Request Response': {
            if (permit.status === 'info-requested') {
              shouldFire = true;
              taskTitle = `Respond to info request: ${permit.name} — ${permit.jurisdiction}`;
              priority = 'urgent';
              const c = JURISDICTION_CONTACTS[permit.jurisdiction];
              draftToCreate = {
                permitId: permit.id,
                subject: `Re: Additional Information Request - ${permit.name}`,
                body: `Dear ${c?.name ?? permit.jurisdiction + ' Permit Office'},\n\nThank you for your review of the permit application for ${permit.name} (${permit.projectName ?? ''}).\n\nIn response to your request for additional information, we are preparing the required documents and anticipate submitting within 5 business days.\n\nPlease let us know if you need any clarification in the meantime.\n\nBest regards,\n[Your Name]`,
                recipient: c?.email ?? null,
                recipientName: c?.name ?? null,
                templateType: 'info-response',
                createdBy: 'agent',
                status: 'pending-review',
              };
            }
            break;
          }

          case 'Hearing Prep Reminder':
            if (hearing !== null && hearing <= 14 && hearing >= 0) {
              shouldFire = true;
              taskTitle = `Hearing prep: ${permit.name} — hearing in ${hearing} days`;
              priority = 'high';
            }
            break;

          case 'Approval Archive':
            if (permit.status === 'approved') {
              shouldFire = true;
              taskTitle = `Archive approved permit: ${permit.name}`;
              priority = 'medium';
            }
            break;

          case 'Expiry Warning':
            if (expiry !== null && expiry <= 30 && expiry >= 0) {
              shouldFire = true;
              taskTitle = `Permit expiring in ${expiry} days: ${permit.name}`;
              priority = expiry <= 7 ? 'urgent' : 'high';
            }
            break;
        }

        if (shouldFire) {
          newTasks.push({
            permitId: permit.id,
            projectId: permit.projectId ?? undefined,
            title: taskTitle,
            type: 'auto',
            ruleId: rule.id,
            priority,
            status: 'pending',
          });

          if (draftToCreate) {
            newDrafts.push(draftToCreate);
          }

          auditEntries.push({
            permitId: permit.id,
            actorType: 'agent',
            action: 'rule_triggered',
            newValue: `Rule: ${rule.name} → task created${draftToCreate ? ' + email draft' : ''}`,
          });

          fired.push({
            ruleName: rule.name,
            permitName: permit.name,
            projectName: permit.projectName ?? 'Unknown',
            taskTitle,
            priority,
          });

          recentSet.add(dedupKey); // prevent same rule firing twice in this run
        }
      }
    }

    // Persist new tasks, drafts, and audit entries
    if (newTasks.length > 0) {
      await db.insert(tasks).values(newTasks);
    }
    if (newDrafts.length > 0) {
      await db.insert(emailDrafts).values(newDrafts);
    }
    if (auditEntries.length > 0) {
      await db.insert(auditLog).values(auditEntries);
    }

    // Increment tasksCreated counter on fired rules
    const firedRuleIds = Array.from(new Set(
      newTasks.map((t) => t.ruleId).filter(Boolean) as string[]
    ));
    for (const ruleId of firedRuleIds) {
      const count = newTasks.filter((t) => t.ruleId === ruleId).length;
      const [current] = await db.select().from(rules).where(eq(rules.id, ruleId)).limit(1);
      if (current) {
        await db
          .update(rules)
          .set({ tasksCreated: (current.tasksCreated ?? 0) + count, updatedAt: new Date() })
          .where(eq(rules.id, ruleId));
      }
    }

    return NextResponse.json({
      tasksCreated: newTasks.length,
      emailDraftsCreated: newDrafts.length,
      rulesEvaluated: enabledRules.length,
      permitsScanned: activePermits.length,
      fired,
    });
  } catch (error) {
    console.error('POST /api/rules/run failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Agent run failed' }, { status: 500 });
  }
}
