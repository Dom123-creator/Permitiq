import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/guards';
import { getDb, users, projectMembers } from '@/lib/db';

// POST /api/team/invite — send an invite (admin/owner only)
export async function POST(request: NextRequest) {
  const sessionOrError = await requireRole(['owner', 'admin']);
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const { email, role = 'pm', projectIds = [] } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const db = getDb();

    // Check not already registered
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return NextResponse.json({ error: 'User with that email already exists' }, { status: 409 });
    }

    const inviteToken = crypto.randomUUID();
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name: email.split('@')[0],
        role,
        inviteToken,
        inviteExpiry,
        isActive: false,
      })
      .returning();

    // Assign project memberships if provided
    if (projectIds.length > 0) {
      await db.insert(projectMembers).values(
        projectIds.map((projectId: string) => ({ projectId, userId: newUser.id }))
      );
    }

    const inviteUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/invite/${inviteToken}`;

    // Send email if SendGrid is configured, else log to console
    if (process.env.SENDGRID_API_KEY) {
      // TODO: integrate SendGrid send
      console.log('[SendGrid] Invite email would be sent to:', email);
    } else {
      console.log(`[DEV] Invite URL for ${email}:`, inviteUrl);
    }

    return NextResponse.json({ success: true, inviteUrl }, { status: 201 });
  } catch (error) {
    console.error('POST /api/team/invite failed:', error);
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
  }
}
