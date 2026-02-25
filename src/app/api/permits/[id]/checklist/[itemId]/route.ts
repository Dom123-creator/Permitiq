import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb, checklistItems } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

// PATCH /api/permits/[id]/checklist/[itemId] — toggle completed or update label
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  const { id: permitId, itemId } = await params;
  try {
    const body = await request.json();
    const db = getDb();

    const updates: Record<string, unknown> = {};
    if ('completed' in body) {
      updates.completed = body.completed;
      updates.completedAt = body.completed ? new Date() : null;
      updates.completedBy = body.completed ? session.user.name ?? session.user.email : null;
    }
    if ('label' in body) updates.label = body.label;
    if ('category' in body) updates.category = body.category;
    if ('required' in body) updates.required = body.required;

    const [updated] = await db
      .update(checklistItems)
      .set(updates)
      .where(and(eq(checklistItems.id, itemId), eq(checklistItems.permitId, permitId)))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/permits/[id]/checklist/[itemId] failed:', error);
    return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 });
  }
}

// DELETE /api/permits/[id]/checklist/[itemId]
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const { id: permitId, itemId } = await params;
  try {
    const db = getDb();
    const [deleted] = await db
      .delete(checklistItems)
      .where(and(eq(checklistItems.id, itemId), eq(checklistItems.permitId, permitId)))
      .returning();

    if (!deleted) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/permits/[id]/checklist/[itemId] failed:', error);
    return NextResponse.json({ error: 'Failed to delete checklist item' }, { status: 500 });
  }
}
