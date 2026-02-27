/**
 * Proactive Agent Scanner
 *
 * Scans active permits, upcoming inspections, and due tasks to push
 * time-sensitive alerts to users via Telegram/SMS.
 *
 * Designed for on-the-go PMs — messages are short, actionable, urgent only.
 */

import { and, eq, isNull, ne, lte, gte, isNotNull, lt } from 'drizzle-orm';
import { getDb, permits, inspections, tasks, projects, users } from '@/lib/db';
import { notifyUser, notifyAllActiveUsers } from '@/lib/notifications/notify';

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function daysUntil(date: Date): number {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function daysAgo(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// --------------------------------------------------------------------------
// Permit overdue check
// --------------------------------------------------------------------------

export async function checkOverduePermits(): Promise<void> {
  const db = getDb();

  const activePermits = await db
    .select({
      id: permits.id,
      name: permits.name,
      type: permits.type,
      jurisdiction: permits.jurisdiction,
      status: permits.status,
      daysInQueue: permits.daysInQueue,
      submittedAt: permits.submittedAt,
      projectId: permits.projectId,
    })
    .from(permits)
    .where(
      and(
        eq(permits.archived, false),
        ne(permits.status, 'approved'),
        ne(permits.status, 'rejected'),
        isNotNull(permits.submittedAt)
      )
    );

  for (const permit of activePermits) {
    const days = permit.daysInQueue ?? 0;

    // Only alert on significantly overdue (>25 days without update)
    if (days >= 25) {
      const msg =
        `⚠️ *Overdue Permit*\n` +
        `*${permit.name}* (${permit.type})\n` +
        `📍 ${permit.jurisdiction}\n` +
        `🕐 ${days} days in queue — no update\n` +
        `Status: ${permit.status}\n` +
        `Action: Check portal + follow up today`;

      void notifyAllActiveUsers('permit.status', () => msg);
    }
  }
}

// --------------------------------------------------------------------------
// Expiry warnings
// --------------------------------------------------------------------------

export async function checkExpiringPermits(): Promise<void> {
  const db = getDb();
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiring = await db
    .select({
      id: permits.id,
      name: permits.name,
      type: permits.type,
      jurisdiction: permits.jurisdiction,
      expiryDate: permits.expiryDate,
      projectId: permits.projectId,
    })
    .from(permits)
    .where(
      and(
        eq(permits.archived, false),
        isNotNull(permits.expiryDate),
        lte(permits.expiryDate, in30),
        gte(permits.expiryDate, now)
      )
    );

  for (const permit of expiring) {
    if (!permit.expiryDate) continue;
    const days = daysUntil(permit.expiryDate);

    // Only send on 30, 14, 7, 3, 1 day marks to avoid spam
    if (![30, 14, 7, 3, 1].includes(days)) continue;

    const urgency = days <= 3 ? '🚨' : days <= 7 ? '⚠️' : '📅';
    const msg =
      `${urgency} *Permit Expiring in ${days}d*\n` +
      `*${permit.name}* (${permit.type})\n` +
      `📍 ${permit.jurisdiction}\n` +
      `Expires: ${permit.expiryDate.toLocaleDateString()}\n` +
      `Action: Renew before expiry`;

    void notifyAllActiveUsers('expiry', () => msg);
  }
}

// --------------------------------------------------------------------------
// Inspection alerts
// --------------------------------------------------------------------------

export async function checkUpcomingInspections(): Promise<void> {
  const db = getDb();
  const now = new Date();

  // Tomorrow window
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const upcoming = await db
    .select({
      id: inspections.id,
      permitId: inspections.permitId,
      type: inspections.type,
      scheduledDate: inspections.scheduledDate,
      inspectorName: inspections.inspectorName,
      inspectorContact: inspections.inspectorContact,
    })
    .from(inspections)
    .where(
      and(
        isNull(inspections.result),
        isNotNull(inspections.scheduledDate),
        gte(inspections.scheduledDate, tomorrowStart),
        lte(inspections.scheduledDate, tomorrowEnd)
      )
    );

  if (upcoming.length === 0) return;

  const lines = upcoming.map((insp) => {
    const time = insp.scheduledDate
      ? insp.scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : 'TBD';
    const inspector = insp.inspectorName ? ` — ${insp.inspectorName}` : '';
    return `• ${insp.type} @ ${time}${inspector}`;
  });

  const msg =
    `📋 *Inspections Tomorrow*\n` +
    `${upcoming.length} scheduled:\n` +
    lines.join('\n') +
    `\n\nHave docs ready and site accessible`;

  void notifyAllActiveUsers('inspection.result', () => msg);
}

// --------------------------------------------------------------------------
// Tasks due today
// --------------------------------------------------------------------------

export async function checkTasksDueToday(): Promise<void> {
  const db = getDb();
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const dueTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      assignee: tasks.assignee,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .where(
      and(
        ne(tasks.status, 'completed'),
        isNotNull(tasks.dueDate),
        gte(tasks.dueDate, todayStart),
        lte(tasks.dueDate, todayEnd)
      )
    );

  if (dueTasks.length === 0) return;

  const urgent = dueTasks.filter((t) => t.priority === 'urgent');
  const high = dueTasks.filter((t) => t.priority === 'high');

  // Notify assignees individually
  for (const task of dueTasks) {
    if (!task.assignee) continue;
    const emoji = task.priority === 'urgent' ? '🚨' : task.priority === 'high' ? '⚠️' : '📌';
    const msg =
      `${emoji} *Task Due Today*\n` +
      `${task.title}\n` +
      `Priority: ${task.priority.toUpperCase()}`;
    void notifyUser(task.assignee, 'task.created', msg);
  }

  // Broadcast summary to admins if there are urgent tasks
  if (urgent.length > 0) {
    const msg =
      `🚨 *${urgent.length} Urgent Tasks Due Today*\n` +
      urgent.map((t) => `• ${t.title}`).join('\n') +
      (high.length > 0 ? `\n+ ${high.length} high priority` : '');
    void notifyAllActiveUsers('task.created', () => msg);
  }
}

// --------------------------------------------------------------------------
// Daily digest (8 AM summary)
// --------------------------------------------------------------------------

export async function sendDailyDigest(): Promise<void> {
  const db = getDb();
  const now = new Date();

  // Count active permits
  const allPermits = await db
    .select({
      id: permits.id,
      status: permits.status,
      daysInQueue: permits.daysInQueue,
      expiryDate: permits.expiryDate,
    })
    .from(permits)
    .where(eq(permits.archived, false));

  const total = allPermits.length;
  const pending = allPermits.filter(
    (p) => p.status !== 'approved' && p.status !== 'rejected'
  ).length;
  const overdue = allPermits.filter((p) => (p.daysInQueue ?? 0) >= 20).length;
  const expiringSoon = allPermits.filter((p) => {
    if (!p.expiryDate) return false;
    const d = daysUntil(p.expiryDate);
    return d >= 0 && d <= 30;
  }).length;

  // Count tasks pending
  const pendingTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(ne(tasks.status, 'completed'));

  // Tomorrow inspections
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const tomorrowInspections = await db
    .select({ id: inspections.id })
    .from(inspections)
    .where(
      and(
        isNull(inspections.result),
        isNotNull(inspections.scheduledDate),
        gte(inspections.scheduledDate, tomorrowStart),
        lte(inspections.scheduledDate, tomorrowEnd)
      )
    );

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  void notifyAllActiveUsers('daily.digest', (user) => {
    return (
      `☀️ *Good morning, ${user.name.split(' ')[0]}!*\n` +
      `PermitIQ Daily Digest — ${dateStr}\n\n` +
      `📋 Permits: ${pending}/${total} active\n` +
      (overdue > 0 ? `⚠️ Overdue: ${overdue} permits\n` : '') +
      (expiringSoon > 0 ? `📅 Expiring soon: ${expiringSoon}\n` : '') +
      `✅ Tasks pending: ${pendingTasks.length}\n` +
      (tomorrowInspections.length > 0
        ? `🔍 Inspections tomorrow: ${tomorrowInspections.length}\n`
        : '') +
      `\nLogin to PermitIQ for details`
    );
  });
}

// --------------------------------------------------------------------------
// Info-requested deadline check
// --------------------------------------------------------------------------

export async function checkInfoRequestDeadlines(): Promise<void> {
  const db = getDb();
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const infoRequested = await db
    .select({
      id: permits.id,
      name: permits.name,
      type: permits.type,
      jurisdiction: permits.jurisdiction,
      submissionDeadline: permits.submissionDeadline,
      correctionNotes: permits.correctionNotes,
    })
    .from(permits)
    .where(
      and(
        eq(permits.archived, false),
        eq(permits.status, 'info-requested'),
        isNotNull(permits.submissionDeadline),
        lte(permits.submissionDeadline, in48h)
      )
    );

  for (const permit of infoRequested) {
    if (!permit.submissionDeadline) continue;
    const hoursLeft = Math.ceil(
      (permit.submissionDeadline.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    const msg =
      `🚨 *Info Request Deadline: ${hoursLeft}h left*\n` +
      `*${permit.name}* (${permit.type})\n` +
      `📍 ${permit.jurisdiction}\n` +
      (permit.correctionNotes
        ? `Notes: ${permit.correctionNotes.slice(0, 100)}\n`
        : '') +
      `Deadline: ${permit.submissionDeadline.toLocaleString()}\n` +
      `Action: Submit response NOW`;

    void notifyAllActiveUsers('deadline', () => msg);
  }
}

// --------------------------------------------------------------------------
// Main entry points
// --------------------------------------------------------------------------

/**
 * Full scan — runs all checks. Call from scheduler or /api/agent/scan.
 */
export async function runFullScan(): Promise<{ checks: string[]; errors: string[] }> {
  const checks: string[] = [];
  const errors: string[] = [];

  const run = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      checks.push(name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${name}: ${msg}`);
      console.error(`[scanner] ${name} failed:`, err);
    }
  };

  await run('overdue-permits', checkOverduePermits);
  await run('expiring-permits', checkExpiringPermits);
  await run('upcoming-inspections', checkUpcomingInspections);
  await run('tasks-due-today', checkTasksDueToday);
  await run('info-request-deadlines', checkInfoRequestDeadlines);

  return { checks, errors };
}

/**
 * Daily digest only — called at 8 AM.
 */
export async function runDailyDigest(): Promise<void> {
  try {
    await sendDailyDigest();
  } catch (err) {
    console.error('[scanner] daily digest failed:', err);
  }
}
