import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, users } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

// PATCH /api/account/profile — update current user's name
export async function PATCH(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  try {
    const body = await request.json();
    const name = (body.name ?? '').trim();

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json({ error: 'name must be 100 characters or fewer' }, { status: 400 });
    }

    const db = getDb();
    const [updated] = await db
      .update(users)
      .set({ name, updatedAt: new Date() })
      .where(eq(users.id, session.user.id))
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/account/profile failed:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

// GET /api/account/profile — get current user's profile
export async function GET(_request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  try {
    const db = getDb();
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        notificationChannel: users.notificationChannel,
        telegramChatId: users.telegramChatId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    console.error('GET /api/account/profile failed:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
