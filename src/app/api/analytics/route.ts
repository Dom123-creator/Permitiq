import { NextResponse } from 'next/server';
import { eq, and, sql, desc, ne } from 'drizzle-orm';
import { getDb, permits, projects, inspections, tasks, auditLog, users, fees } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

const JURISDICTION_AVG: Record<string, number> = {
  Houston: 15,
  'Harris County': 20,
  Austin: 18,
  Dallas: 16,
  'San Antonio': 14,
};
const DEFAULT_AVG = 15;

function avgForPermit(jurisdiction: string, type: string): number {
  const base = JURISDICTION_AVG[jurisdiction] ?? DEFAULT_AVG;
  return type === 'Fire' ? base + 5 : base;
}

function computeDays(submittedAt: Date | null, stored: number | null): number {
  if (!submittedAt) return stored ?? 0;
  const ms = Date.now() - new Date(submittedAt).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export async function GET() {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const db = getDb();

    // ── 1. All active permits with project data ──────────────────────────────
    const allPermits = await db
      .select({
        id: permits.id,
        name: permits.name,
        type: permits.type,
        jurisdiction: permits.jurisdiction,
        status: permits.status,
        submissionStatus: permits.submissionStatus,
        daysInQueue: permits.daysInQueue,
        submittedAt: permits.submittedAt,
        feeBudgeted: permits.feeBudgeted,
        feeActual: permits.feeActual,
        projectId: permits.projectId,
        projectName: projects.name,
        projectClient: projects.client,
        dailyCarryingCost: projects.dailyCarryingCost,
      })
      .from(permits)
      .leftJoin(projects, eq(permits.projectId, projects.id))
      .where(eq(permits.archived, false));

    // ── 2. Inspection pass rates per permit ──────────────────────────────────
    const inspectionStats = await db
      .select({
        permitId: inspections.permitId,
        total: sql<number>`cast(count(*) as int)`,
        passed: sql<number>`cast(count(*) filter (where ${inspections.result} = 'pass') as int)`,
      })
      .from(inspections)
      .groupBy(inspections.permitId);

    const inspMap = new Map(inspectionStats.map((i) => [i.permitId, i]));

    // ── 3. Fee totals ────────────────────────────────────────────────────────
    const feeTotals = await db
      .select({
        permitId: fees.permitId,
        totalActual: sql<number>`cast(coalesce(sum(${fees.amount}), 0) as float)`,
      })
      .from(fees)
      .groupBy(fees.permitId);

    const feeMap = new Map(feeTotals.map((f) => [f.permitId, f.totalActual]));

    // ── 4. Pending tasks count ───────────────────────────────────────────────
    const [{ pendingTasks }] = await db
      .select({ pendingTasks: sql<number>`cast(count(*) as int)` })
      .from(tasks)
      .where(ne(tasks.status, 'completed'));

    // ── 5. Recent activity ───────────────────────────────────────────────────
    const recentActivity = await db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        oldValue: auditLog.oldValue,
        newValue: auditLog.newValue,
        timestamp: auditLog.timestamp,
        actorType: auditLog.actorType,
        permitName: permits.name,
        projectName: projects.name,
        actorName: users.name,
      })
      .from(auditLog)
      .leftJoin(permits, eq(auditLog.permitId, permits.id))
      .leftJoin(projects, eq(permits.projectId, projects.id))
      .leftJoin(users, eq(sql`${auditLog.actorId}::uuid`, users.id))
      .orderBy(desc(auditLog.timestamp))
      .limit(12);

    // ── Compute derived metrics ──────────────────────────────────────────────
    const enriched = allPermits.map((p) => {
      const days = computeDays(p.submittedAt, p.daysInQueue);
      const avg = avgForPermit(p.jurisdiction, p.type);
      const isTerminal = p.status === 'approved' || p.status === 'rejected';
      const daysOverdue = isTerminal ? 0 : Math.max(0, days - avg);
      const carryingCost = parseFloat(p.dailyCarryingCost ?? '0') || 0;
      const delayCost = daysOverdue * carryingCost;
      const feeBudget = parseFloat(p.feeBudgeted ?? '0') || 0;
      const feeActual = feeMap.get(p.id) ?? 0;
      const insp = inspMap.get(p.id);

      return { ...p, days, avg, daysOverdue, delayCost, carryingCost, feeBudget, feeActual, insp };
    });

    const active = enriched.filter((p) => p.status !== 'rejected' && p.status !== 'approved');

    // KPIs
    const totalActivePermits = active.length;
    const overduePermits = enriched.filter((p) => p.daysOverdue > 0).length;
    const totalDelayCost = enriched.reduce((s, p) => s + p.delayCost, 0);
    const avgDaysInQueue = active.length
      ? active.reduce((s, p) => s + p.days, 0) / active.length
      : 0;
    const approvedCount = enriched.filter((p) => p.status === 'approved').length;
    const approvalRate = enriched.length ? (approvedCount / enriched.length) * 100 : 0;
    const totalFeeBudget = enriched.reduce((s, p) => s + p.feeBudget, 0);
    const totalFeeActual = enriched.reduce((s, p) => s + p.feeActual, 0);
    const feeVariance = totalFeeActual - totalFeeBudget;

    // Status distribution
    const statusCounts: Record<string, number> = {};
    for (const p of enriched) {
      statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
    }
    const total = enriched.length || 1;
    const statusOrder = ['pending', 'under-review', 'info-requested', 'approved', 'rejected'];
    const statusDistribution = statusOrder
      .filter((s) => statusCounts[s])
      .map((s) => ({ status: s, count: statusCounts[s], pct: Math.round((statusCounts[s] / total) * 100) }));

    // Submission pipeline
    const subCounts: Record<string, number> = {};
    for (const p of enriched) {
      subCounts[p.submissionStatus ?? 'draft'] = (subCounts[p.submissionStatus ?? 'draft'] ?? 0) + 1;
    }
    const submissionPipeline = {
      draft: subCounts['draft'] ?? 0,
      submitted: subCounts['submitted'] ?? 0,
      underReview: subCounts['under-review'] ?? 0,
      correctionsRequired: subCounts['corrections-required'] ?? 0,
      approved: subCounts['approved'] ?? 0,
    };

    // Jurisdiction velocity
    const jurMap: Record<string, { count: number; totalDays: number; overdue: number; benchmark: number }> = {};
    for (const p of enriched) {
      if (!jurMap[p.jurisdiction]) jurMap[p.jurisdiction] = { count: 0, totalDays: 0, overdue: 0, benchmark: p.avg };
      jurMap[p.jurisdiction].count++;
      jurMap[p.jurisdiction].totalDays += p.days;
      if (p.daysOverdue > 0) jurMap[p.jurisdiction].overdue++;
    }
    const jurisdictions = Object.entries(jurMap)
      .map(([jurisdiction, v]) => ({
        jurisdiction,
        count: v.count,
        avgDays: Math.round(v.totalDays / v.count),
        benchmark: v.benchmark,
        overdueCount: v.overdue,
      }))
      .sort((a, b) => b.count - a.count);

    // Permit type breakdown
    const typeMap: Record<string, { count: number; totalDays: number; approved: number }> = {};
    for (const p of enriched) {
      if (!typeMap[p.type]) typeMap[p.type] = { count: 0, totalDays: 0, approved: 0 };
      typeMap[p.type].count++;
      typeMap[p.type].totalDays += p.days;
      if (p.status === 'approved') typeMap[p.type].approved++;
    }
    const permitTypes = Object.entries(typeMap)
      .map(([type, v]) => ({
        type,
        count: v.count,
        avgDays: Math.round(v.totalDays / v.count),
        approvalRate: Math.round((v.approved / v.count) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // Project health
    const projMap: Record<string, {
      name: string; client: string | null; dailyCarryingCost: number;
      permitCount: number; overdueCount: number; delayCost: number;
      inspTotal: number; inspPassed: number;
    }> = {};
    for (const p of enriched) {
      if (!p.projectId) continue;
      if (!projMap[p.projectId]) {
        projMap[p.projectId] = {
          name: p.projectName ?? '—',
          client: p.projectClient ?? null,
          dailyCarryingCost: p.carryingCost,
          permitCount: 0, overdueCount: 0, delayCost: 0,
          inspTotal: 0, inspPassed: 0,
        };
      }
      const proj = projMap[p.projectId];
      proj.permitCount++;
      if (p.daysOverdue > 0) proj.overdueCount++;
      proj.delayCost += p.delayCost;
      proj.inspTotal += p.insp?.total ?? 0;
      proj.inspPassed += p.insp?.passed ?? 0;
    }
    const projectHealth = Object.entries(projMap)
      .map(([id, v]) => ({
        id,
        name: v.name,
        client: v.client,
        permitCount: v.permitCount,
        overdueCount: v.overdueCount,
        delayCost: v.delayCost,
        inspectionPassRate: v.inspTotal > 0 ? Math.round((v.inspPassed / v.inspTotal) * 100) : null,
        dailyCarryingCost: v.dailyCarryingCost,
      }))
      .sort((a, b) => b.delayCost - a.delayCost);

    return NextResponse.json({
      kpis: {
        totalActivePermits,
        overduePermits,
        totalDelayCost,
        avgDaysInQueue: Math.round(avgDaysInQueue * 10) / 10,
        approvalRate: Math.round(approvalRate),
        feeVariance,
        pendingTasks,
        totalPermits: enriched.length,
      },
      statusDistribution,
      submissionPipeline,
      jurisdictions,
      permitTypes,
      projectHealth,
      recentActivity: recentActivity.map((a) => ({
        ...a,
        actorName: a.actorType === 'agent' ? 'PermitIQ Agent' : (a.actorName ?? 'Unknown'),
      })),
    });
  } catch (error) {
    console.error('GET /api/analytics failed:', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
