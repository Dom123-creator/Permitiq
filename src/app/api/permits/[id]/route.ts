import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, permits, auditLog } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/permits/[id]
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const { id } = await params;
  try {
    const db = getDb();
    const [permit] = await db.select().from(permits).where(eq(permits.id, id)).limit(1);
    if (!permit) return NextResponse.json({ error: 'Permit not found' }, { status: 404 });
    return NextResponse.json(permit);
  } catch (error) {
    console.error('GET /api/permits/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to fetch permit' }, { status: 500 });
  }
}

// PATCH /api/permits/[id] — update status, notes, expiry, fees, etc.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  const { id } = await params;
  try {
    const body = await request.json();
    const db = getDb();

    // Fetch current state for audit log
    const [current] = await db.select().from(permits).where(eq(permits.id, id)).limit(1);
    if (!current) return NextResponse.json({ error: 'Permit not found' }, { status: 404 });

    const allowedFields = [
      'name', 'type', 'jurisdiction',
      'status', 'notes', 'expiryDate', 'feeBudgeted', 'feeActual',
      'permitNumber', 'authority', 'hearingDate', 'archived',
    ] as const;

    // Build update payload from allowed fields only
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field] === null ? null : body[field];
      }
    }

    const [updated] = await db
      .update(permits)
      .set(updates)
      .where(eq(permits.id, id))
      .returning();

    // Write audit entry for status changes
    if (body.status && body.status !== current.status) {
      await db.insert(auditLog).values({
        permitId: id,
        actorType: 'user',
        actorId: session.user.id,
        action: 'status_changed',
        oldValue: current.status,
        newValue: body.status,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/permits/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to update permit' }, { status: 500 });
  }
}

// DELETE /api/permits/[id] — soft delete (archive)
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  const { id } = await params;
  try {
    const db = getDb();
    const [updated] = await db
      .update(permits)
      .set({ archived: true, updatedAt: new Date() })
      .where(eq(permits.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Permit not found' }, { status: 404 });

    await db.insert(auditLog).values({
      permitId: id,
      actorType: 'user',
      actorId: session.user.id,
      action: 'permit_archived',
      newValue: 'archived',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/permits/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to archive permit' }, { status: 500 });
  }
}
