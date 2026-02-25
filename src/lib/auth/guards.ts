import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export interface AuthSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
  };
}

/**
 * Require an authenticated session. Returns the session or a 401 NextResponse.
 */
export async function requireAuth(): Promise<AuthSession | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session as AuthSession;
}

/**
 * Require one of the specified roles. Returns the session or a 401/403 NextResponse.
 */
export async function requireRole(roles: string[]): Promise<AuthSession | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!roles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return session as AuthSession;
}
