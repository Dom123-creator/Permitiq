import { NextResponse } from 'next/server';
import { and, gte, lte, eq, or, isNull } from 'drizzle-orm';
import { getDb, inspections } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const now = new Date();
    const weekOut = new Date(now.getTime() + 7 * 86_400_000);

    const all = await db
      .select({
        result: inspections.result,
        scheduledDate: inspections.scheduledDate,
      })
      .from(inspections);

    let totalScheduled = 0;
    let thisWeek = 0;
    let passed = 0;
    let failedOrPartial = 0;

    for (const row of all) {
      const isScheduled = !row.result || row.result === 'scheduled';
      const isCancelled = row.result === 'cancelled';

      if (isCancelled) continue;

      if (isScheduled) totalScheduled++;
      if (row.result === 'pass') passed++;
      if (row.result === 'fail' || row.result === 'partial') failedOrPartial++;

      if (isScheduled && row.scheduledDate) {
        const d = new Date(row.scheduledDate);
        if (d >= now && d <= weekOut) thisWeek++;
      }
    }

    return NextResponse.json({ totalScheduled, thisWeek, passed, failedOrPartial });
  } catch (error) {
    console.error('GET /api/inspections/stats failed:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch inspection stats' }, { status: 500 });
  }
}
