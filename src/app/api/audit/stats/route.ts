import { NextResponse } from 'next/server';
import { gte, sql } from 'drizzle-orm';
import { getDb, auditLog } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totals] = await db
      .select({
        total: sql<number>`cast(count(*) as int)`,
        userCount: sql<number>`cast(count(*) filter (where ${auditLog.actorType} = 'user') as int)`,
        agentCount: sql<number>`cast(count(*) filter (where ${auditLog.actorType} = 'agent') as int)`,
      })
      .from(auditLog);

    const [todayRow] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(auditLog)
      .where(gte(auditLog.timestamp, todayStart));

    return NextResponse.json({
      total: totals?.total ?? 0,
      userCount: totals?.userCount ?? 0,
      agentCount: totals?.agentCount ?? 0,
      today: todayRow?.count ?? 0,
    });
  } catch (error) {
    console.error('GET /api/audit/stats failed:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch audit stats' }, { status: 500 });
  }
}
