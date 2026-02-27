import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, users } from '@/lib/db';
import { sendEmail, passwordResetEmailHtml } from '@/lib/email/sendgrid';

// POST /api/auth/forgot-password
// Public — no auth required.
// Always returns 200 to prevent email enumeration.
export async function POST(request: NextRequest) {
  let email: string;

  try {
    const body = await request.json();
    email = (body.email ?? '').trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ ok: true }); // silent fail — don't reveal anything
  }

  try {
    const db = getDb();
    const [user] = await db
      .select({ id: users.id, name: users.name, isActive: users.isActive, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Only send if user exists, is active, and has a password (not SSO-only)
    if (user && user.isActive && user.passwordHash) {
      const resetToken = crypto.randomUUID();
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db
        .update(users)
        .set({ passwordResetToken: resetToken, passwordResetExpiry: resetExpiry })
        .where(eq(users.id, user.id));

      const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
      const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

      void sendEmail({
        to: email,
        toName: user.name,
        subject: 'Reset your PermitIQ password',
        html: passwordResetEmailHtml({ resetUrl }),
        text: `You requested a password reset.\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`,
      });
    }
  } catch (error) {
    console.error('POST /api/auth/forgot-password error:', error);
    // Still return 200 — never reveal errors to unauthenticated callers
  }

  return NextResponse.json({ ok: true });
}
