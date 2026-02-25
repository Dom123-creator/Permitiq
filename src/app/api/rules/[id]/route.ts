import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, rules } from '@/lib/db';
import { requireRole } from '@/lib/auth/guards';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/rules/[id] — update enabled toggle or other fields (admin/owner only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const sessionOrError = await requireRole(['owner', 'admin']);
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const { id } = await params;
  try {
    const body = await request.json();
    const db = getDb();

    const [existing] = await db.select().from(rules).where(eq(rules.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.enabled === 'boolean') updates.enabled = body.enabled;
    if (body.name) updates.name = body.name;
    if (body.description) updates.description = body.description;

    const [updated] = await db
      .update(rules)
      .set(updates)
      .where(eq(rules.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/rules/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
  }
}
