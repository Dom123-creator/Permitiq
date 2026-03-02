import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gt, isNotNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getDb, users } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';

// POST /api/auth/reset-password
// Public — no auth required.
// Body: { token: string, password: string }
export async function POST(request: NextRequest) {
  // Rate limit: 10 attempts/hour per IP — prevents token brute-force
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  const rl = rateLimit(`reset-pw-ip:${ip}`, { windowMs: 60 * 60_000, max: 10 });
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  let token: string;
  let password: string;

  try {
    const body = await request.json();
    token = (body.token ?? '').trim();
    password = body.password ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!token || !password) {
    return NextResponse.json({ error: 'token and password are required' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  try {
    const db = getDb();

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, token),
          isNotNull(users.passwordResetExpiry),
          gt(users.passwordResetExpiry, new Date()),
        ),
      )
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db
      .update(users)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/auth/reset-password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
