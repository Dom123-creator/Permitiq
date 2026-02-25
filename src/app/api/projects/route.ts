import { NextRequest, NextResponse } from 'next/server';
import { asc, eq, inArray } from 'drizzle-orm';
import { getDb, projects, projectMembers } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

// POST /api/projects — create a new project
export async function POST(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

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
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  try {
    const db = getDb();

    // Project scoping for non-admin/owner roles
    let scopedProjectIds: string[] | null = null;
    if (!['owner', 'admin'].includes(session.user.role)) {
      const memberships = await db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, session.user.id));
      scopedProjectIds = memberships.map((m) => m.projectId);
      if (scopedProjectIds.length === 0) return NextResponse.json([]);
    }

    const rows = await db
      .select({ id: projects.id, name: projects.name, status: projects.status })
      .from(projects)
      .where(scopedProjectIds ? inArray(projects.id, scopedProjectIds) : undefined)
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
