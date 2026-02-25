import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { getDb, projects } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select({ id: projects.id, name: projects.name, status: projects.status })
      .from(projects)
      .orderBy(asc(projects.name));
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/projects failed:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}
