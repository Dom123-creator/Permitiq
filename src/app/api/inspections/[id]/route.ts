import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, inspections, tasks, auditLog } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/inspections/[id] — update result, notes, inspector info
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const body = await request.json();
    const db = getDb();

    const [existing] = await db
      .select()
      .from(inspections)
      .where(eq(inspections.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if ('result' in body) updates.result = body.result;
    if ('notes' in body) updates.notes = body.notes;
    if ('inspectorName' in body) updates.inspectorName = body.inspectorName;
    if ('inspectorContact' in body) updates.inspectorContact = body.inspectorContact;
    if ('scheduledDate' in body) {
      updates.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
    }

    const [updated] = await db
      .update(inspections)
      .set(updates)
      .where(eq(inspections.id, id))
      .returning();

    // If inspection failed, auto-create a re-inspection task
    if (body.result === 'fail' && existing.result !== 'fail') {
      await db.insert(tasks).values({
        permitId: existing.permitId,
        title: `Schedule re-inspection: ${existing.type} failed`,
        type: 'auto',
        priority: 'high',
        status: 'pending',
      });

      await db.insert(auditLog).values({
        permitId: existing.permitId,
        actorType: 'agent',
        action: 'task_created',
        newValue: `Re-inspection task auto-created after ${existing.type} failed`,
      });
    }

    // Write audit entry for result changes
    if (body.result && body.result !== existing.result) {
      await db.insert(auditLog).values({
        permitId: existing.permitId,
        actorType: 'user',
        action: 'inspection_result_set',
        oldValue: existing.result ?? 'scheduled',
        newValue: body.result,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/inspections/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to update inspection' }, { status: 500 });
  }
}

// DELETE /api/inspections/[id] — cancel an inspection
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const db = getDb();
    const [updated] = await db
      .update(inspections)
      .set({ result: 'cancelled' })
      .where(eq(inspections.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/inspections/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to cancel inspection' }, { status: 500 });
  }
}
