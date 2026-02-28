import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb, tasks } from '@/lib/db';
import { requireV1Auth } from '@/lib/auth/v1Auth';

// GET /api/v1/tasks
export async function GET(request: NextRequest) {
  const session = await requireV1Auth(request);
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const status = searchParams.get('status');
  const offset = (page - 1) * limit;

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(tasks)
      .where(status ? eq(tasks.status, status) : undefined)
      .orderBy(desc(tasks.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      data: rows,
      meta: { total: rows.length, page, limit },
    });
  } catch (error) {
    console.error('GET /api/v1/tasks failed:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}
