import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, fees } from '@/lib/db';

// PATCH /api/fees/[id] — update fee (mark paid, change amount/type)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const db = getDb();

    const [existing] = await db.select().from(fees).where(eq(fees.id, params.id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 });
    }

    const allowedFields = ['type', 'amount', 'paidAt', 'receiptUrl'] as const;
    const updates: Partial<typeof fees.$inferInsert> = {};

    for (const field of allowedFields) {
      if (field in body) {
        if (field === 'paidAt') {
          updates.paidAt = body.paidAt ? new Date(body.paidAt) : null;
        } else if (field === 'amount') {
          updates.amount = String(body.amount);
        } else {
          (updates as Record<string, unknown>)[field] = body[field];
        }
      }
    }

    const [updated] = await db.update(fees).set(updates).where(eq(fees.id, params.id)).returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/fees/[id] failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to update fee' }, { status: 500 });
  }
}

// DELETE /api/fees/[id] — hard delete
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();

    const [existing] = await db.select().from(fees).where(eq(fees.id, params.id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 });
    }

    await db.delete(fees).where(eq(fees.id, params.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/fees/[id] failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to delete fee' }, { status: 500 });
  }
}
