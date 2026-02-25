import { NextRequest, NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { getDb, projects } from '@/lib/db';

// POST /api/projects — create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, client, status } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const db = getDb();
    const [project] = await db
      .insert(projects)
      .values({
        name: name.trim(),
        client: client?.trim() || null,
        status: status ?? 'active',
      })
      .returning();

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects failed:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

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
