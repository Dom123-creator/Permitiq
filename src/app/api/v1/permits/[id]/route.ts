import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, permits } from '@/lib/db';
import { requireV1Auth } from '@/lib/auth/v1Auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/v1/permits/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await requireV1Auth(request);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  try {
    const db = getDb();
    const [permit] = await db.select().from(permits).where(eq(permits.id, id)).limit(1);
    if (!permit) return NextResponse.json({ error: 'Permit not found' }, { status: 404 });
    return NextResponse.json({ data: permit });
  } catch (error) {
    console.error('GET /api/v1/permits/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to fetch permit' }, { status: 500 });
  }
}

const patchSchema = z.object({
  status: z.enum(['pending', 'under-review', 'info-requested', 'approved', 'rejected']).optional(),
  notes: z.string().max(2000).optional(),
});

// PATCH /api/v1/permits/[id] — status update (write scope required)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await requireV1Auth(request);
  if (session instanceof NextResponse) return session;

  if (!session.scopes.includes('write')) {
    return NextResponse.json({ error: 'Write scope required' }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
    }

    const db = getDb();
    const [existing] = await db.select().from(permits).where(eq(permits.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: 'Permit not found' }, { status: 404 });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

    const [updated] = await db
      .update(permits)
      .set(updates)
      .where(eq(permits.id, id))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PATCH /api/v1/permits/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to update permit' }, { status: 500 });
  }
}
