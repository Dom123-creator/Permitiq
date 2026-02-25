import { NextResponse } from 'next/server';
import { sql, eq } from 'drizzle-orm';
import { getDb, fees, permits, projects } from '@/lib/db';

// GET /api/fees/stats — portfolio-level fee totals
export async function GET() {
  try {
    const db = getDb();

    // Aggregate totals across all fees
    const [totals] = await db
      .select({
        totalCharged: sql<string>`coalesce(sum(${fees.amount}), 0)`,
        totalPaid: sql<string>`coalesce(sum(case when ${fees.paidAt} is not null then ${fees.amount} else 0 end), 0)`,
        totalUnpaid: sql<string>`coalesce(sum(case when ${fees.paidAt} is null then ${fees.amount} else 0 end), 0)`,
        feeCount: sql<number>`cast(count(*) as int)`,
        unpaidCount: sql<number>`cast(count(case when ${fees.paidAt} is null then 1 end) as int)`,
      })
      .from(fees);

    // Budgeted vs actual from permits table
    const [budget] = await db
      .select({
        totalBudgeted: sql<string>`coalesce(sum(${permits.feeBudgeted}), 0)`,
        totalActual: sql<string>`coalesce(sum(${permits.feeActual}), 0)`,
      })
      .from(permits)
      .where(eq(permits.archived, false));

    // Per-project fee breakdown
    const byProject = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        totalCharged: sql<string>`coalesce(sum(${fees.amount}), 0)`,
        totalPaid: sql<string>`coalesce(sum(case when ${fees.paidAt} is not null then ${fees.amount} else 0 end), 0)`,
        feeCount: sql<number>`cast(count(${fees.id}) as int)`,
      })
      .from(projects)
      .leftJoin(permits, eq(permits.projectId, projects.id))
      .leftJoin(fees, eq(fees.permitId, permits.id))
      .groupBy(projects.id, projects.name)
      .orderBy(sql`sum(${fees.amount}) desc nulls last`);

    return NextResponse.json({
      totalCharged: Number(totals.totalCharged),
      totalPaid: Number(totals.totalPaid),
      totalUnpaid: Number(totals.totalUnpaid),
      feeCount: totals.feeCount,
      unpaidCount: totals.unpaidCount,
      totalBudgeted: Number(budget.totalBudgeted),
      totalActual: Number(budget.totalActual),
      byProject,
    });
  } catch (error) {
    console.error('GET /api/fees/stats failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch fee stats' }, { status: 500 });
  }
}
