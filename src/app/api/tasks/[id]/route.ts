import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, tasks } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tasks/[id]
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const db = getDb();
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    return NextResponse.json(task);
  } catch (error) {
    console.error('GET /api/tasks/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

// PATCH /api/tasks/[id] — update status, priority, dueDate, notes, assignee
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const body = await request.json();
    const db = getDb();

    const [existing] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const allowedFields = ['status', 'priority', 'dueDate', 'notes', 'title', 'assignee'] as const;
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    for (const field of allowedFields) {
      if (field in body) {
        if (field === 'dueDate') {
          updates.dueDate = body.dueDate ? new Date(body.dueDate) : null;
        } else {
          updates[field] = body[field];
        }
      }
    }

    const [updated] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/tasks/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const db = getDb();
    const [deleted] = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    if (!deleted) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/tasks/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
