import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getDb, users } from '@/lib/db';

// POST /api/team/invite/accept — accept an invite and set password
export async function POST(request: NextRequest) {
  try {
    const { token, name, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'token and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const db = getDb();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.inviteToken, token))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 });
    }
    if (!user.inviteExpiry || new Date(user.inviteExpiry) < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db
      .update(users)
      .set({
        name: name ?? user.name,
        passwordHash,
        inviteToken: null,
        inviteExpiry: null,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true, email: user.email });
  } catch (error) {
    console.error('POST /api/team/invite/accept failed:', error);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}
