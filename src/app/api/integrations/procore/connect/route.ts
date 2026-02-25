import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards';

// GET /api/integrations/procore/connect — start Procore OAuth flow
export async function GET() {
  const sessionOrError = await requireRole(['owner', 'admin']);
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const clientId = process.env.PROCORE_CLIENT_ID;
  const redirectUri = process.env.PROCORE_REDIRECT_URI ?? 'http://localhost:3000/api/integrations/procore/callback';

  if (!clientId) {
    return NextResponse.json({ error: 'Procore client ID not configured' }, { status: 503 });
  }

  // CSRF state
  const state = crypto.randomUUID();

  const authUrl = new URL('https://login.procore.com/oauth/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set('procore_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
