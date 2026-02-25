import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/guards';
import { getDb, users } from '@/lib/db';

// POST /api/team/invite/resend — resend an invite (admin/owner only)
export async function POST(request: NextRequest) {
  const sessionOrError = await requireRole(['owner', 'admin']);
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user || user.isActive) {
      return NextResponse.json({ error: 'No pending invite found for this user' }, { status: 404 });
    }

    const inviteToken = crypto.randomUUID();
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.update(users).set({ inviteToken, inviteExpiry }).where(eq(users.id, userId));

    const inviteUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/invite/${inviteToken}`;
    console.log(`[DEV] Resent invite URL for ${user.email}:`, inviteUrl);

    return NextResponse.json({ success: true, inviteUrl });
  } catch (error) {
    console.error('POST /api/team/invite/resend failed:', error);
    return NextResponse.json({ error: 'Failed to resend invite' }, { status: 500 });
  }
}
