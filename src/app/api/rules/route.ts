import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { getDb, rules } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

// GET /api/rules — list all rules ordered by creation
export async function GET() {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const db = getDb();
    const rows = await db.select().from(rules).orderBy(desc(rules.createdAt));
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/rules failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}
