import { eq } from 'drizzle-orm';
import { getDb, users } from '@/lib/db';
import { AcceptInviteForm } from '@/components/auth/AcceptInviteForm';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  let user: { email: string; role: string } | null = null;
  let expired = false;

  try {
    const db = getDb();
    const [row] = await db
      .select({ email: users.email, role: users.role, inviteExpiry: users.inviteExpiry })
      .from(users)
      .where(eq(users.inviteToken, token))
      .limit(1);

    if (!row) {
      // invalid token
    } else if (row.inviteExpiry && new Date(row.inviteExpiry) < new Date()) {
      expired = true;
    } else {
      user = { email: row.email, role: row.role };
    }
  } catch {
    // DB not configured — show error
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
            <span className="text-bg font-bold text-lg">P</span>
          </div>
          <span className="text-2xl font-semibold text-text">PermitIQ</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-8">
          {expired ? (
            <>
              <h1 className="text-lg font-semibold text-text mb-2">Invite Expired</h1>
              <p className="text-sm text-muted">This invite link has expired. Ask your team admin to send a new invite.</p>
            </>
          ) : !user ? (
            <>
              <h1 className="text-lg font-semibold text-text mb-2">Invalid Invite</h1>
              <p className="text-sm text-muted">This invite link is not valid. It may have already been used.</p>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-text mb-1">You&apos;ve been invited</h1>
              <p className="text-sm text-muted mb-6">Set up your PermitIQ account to get started.</p>
              <AcceptInviteForm token={token} email={user.email} role={user.role} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
