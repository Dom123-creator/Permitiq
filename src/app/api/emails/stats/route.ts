import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb, emailDrafts } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    const [row] = await db.select({
      total: sql<number>`cast(count(*) as int)`,
      pending: sql<number>`cast(count(*) filter (where ${emailDrafts.status} in ('draft','pending-review')) as int)`,
      sent: sql<number>`cast(count(*) filter (where ${emailDrafts.status} = 'sent') as int)`,
      rejected: sql<number>`cast(count(*) filter (where ${emailDrafts.status} = 'rejected') as int)`,
    }).from(emailDrafts);

    return NextResponse.json({
      total: row?.total ?? 0,
      pending: row?.pending ?? 0,
      sent: row?.sent ?? 0,
      rejected: row?.rejected ?? 0,
    });
  } catch (error) {
    console.error('GET /api/emails/stats failed:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch email stats' }, { status: 500 });
  }
}
