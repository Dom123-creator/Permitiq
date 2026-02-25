import { NextRequest, NextResponse } from 'next/server';
import { eq, and, ne } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/guards';
import { getDb, users } from '@/lib/db';

// PATCH /api/team/members/[id] — update role or isActive
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionOrError = await requireRole(['owner', 'admin']);
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  const { id } = await params;

  try {
    const { role, isActive } = await request.json();
    const db = getDb();

    // Guard: can't downgrade the last owner
    if (role && role !== 'owner') {
      const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1);
      if (target?.role === 'owner') {
        const [ownerCount] = await db
          .select({ count: users.id })
          .from(users)
          .where(and(eq(users.role, 'owner'), ne(users.id, id)));
        if (!ownerCount) {
          return NextResponse.json({ error: 'Cannot demote the last owner' }, { status: 400 });
        }
      }
    }

    // Guard: can't deactivate yourself
    if (isActive === false && id === session.user.id) {
      return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

    await db.update(users).set(updates).where(eq(users.id, id));
    const [updated] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/team/members/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}

// DELETE /api/team/members/[id] — hard delete a pending invite (inactive user)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionOrError = await requireRole(['owner', 'admin']);
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const { id } = await params;

  try {
    const db = getDb();
    const [user] = await db.select({ isActive: users.isActive }).from(users).where(eq(users.id, id)).limit(1);

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (user.isActive) {
      return NextResponse.json({ error: 'Can only delete pending (inactive) invites. Use deactivate instead.' }, { status: 400 });
    }

    await db.delete(users).where(eq(users.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/team/members/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 });
  }
}
