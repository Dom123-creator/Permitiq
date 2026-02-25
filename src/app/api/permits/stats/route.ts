import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, permits } from '@/lib/db';

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

function daysInQueue(submittedAt: Date | null, stored: number | null): number {
  if (!submittedAt) return stored ?? 0;
  return Math.max(0, Math.floor((Date.now() - new Date(submittedAt).getTime()) / 86_400_000));
}

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select({
        status: permits.status,
        jurisdiction: permits.jurisdiction,
        type: permits.type,
        submittedAt: permits.submittedAt,
        daysInQueueStored: permits.daysInQueue,
        expiryDate: permits.expiryDate,
      })
      .from(permits)
      .where(eq(permits.archived, false));

    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86_400_000);

    let total = 0;
    let underReview = 0;
    let overdue = 0;
    let expiringWithin30 = 0;

    for (const r of rows) {
      total++;
      if (r.status === 'under-review') underReview++;

      const days = daysInQueue(r.submittedAt, r.daysInQueueStored);
      const avg = avgDays(r.jurisdiction, r.type);
      if (days > avg) overdue++;

      if (r.expiryDate) {
        const exp = new Date(r.expiryDate);
        if (exp >= now && exp <= in30) expiringWithin30++;
      }
    }

    return NextResponse.json({ total, underReview, overdue, expiringWithin30 });
  } catch (error) {
    console.error('GET /api/permits/stats failed:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch permit stats' }, { status: 500 });
  }
}
