import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, and } from 'drizzle-orm';
import { getDb, tasks, projects, permits, users, rules } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

// GET /api/tasks?projectId=&status=&type=
export async function GET(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const db = getDb();

    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        type: tasks.type,
        priority: tasks.priority,
        status: tasks.status,
        notes: tasks.notes,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        projectId: tasks.projectId,
        permitId: tasks.permitId,
        assigneeId: tasks.assignee,
        ruleId: tasks.ruleId,
        projectName: projects.name,
        permitName: permits.name,
        assigneeName: users.name,
        ruleName: rules.name,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .leftJoin(permits, eq(tasks.permitId, permits.id))
      .leftJoin(users, eq(tasks.assignee, users.id))
      .leftJoin(rules, eq(tasks.ruleId, rules.id))
      .where(
        and(
          projectId ? eq(tasks.projectId, projectId) : undefined,
          status ? eq(tasks.status, status) : undefined,
          type ? eq(tasks.type, type) : undefined,
        )
      )
      .orderBy(desc(tasks.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/tasks failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/tasks — create a task
export async function POST(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const body = await request.json();
    const { title, projectId, permitId, type = 'manual', priority = 'medium', dueDate, notes, assigneeId } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const db = getDb();
    const [task] = await db
      .insert(tasks)
      .values({
        title,
        projectId: projectId ?? null,
        permitId: permitId ?? null,
        type,
        priority,
        status: 'pending',
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes ?? null,
        assignee: assigneeId ?? null,
      })
      .returning();

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('POST /api/tasks failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
