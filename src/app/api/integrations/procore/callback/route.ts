import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/guards';
import { getDb, integrations } from '@/lib/db';

// GET /api/integrations/procore/callback?code=&state=
export async function GET(request: NextRequest) {
  const sessionOrError = await requireRole(['owner', 'admin']);
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const storedState = request.cookies.get('procore_oauth_state')?.value;

  if (!state || !storedState || state !== storedState) {
    return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  const clientId = process.env.PROCORE_CLIENT_ID;
  const clientSecret = process.env.PROCORE_CLIENT_SECRET;
  const redirectUri = process.env.PROCORE_REDIRECT_URI ?? 'http://localhost:3000/api/integrations/procore/callback';

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Procore credentials not configured' }, { status: 503 });
  }

  try {
    const tokenRes = await fetch('https://login.procore.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Procore token exchange failed:', err);
      return NextResponse.redirect(new URL('/integrations?error=procore_auth_failed', request.url));
    }

    const tokens = await tokenRes.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const db = getDb();

    // Upsert integration row
    const [existing] = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(and(eq(integrations.userId, session.user.id), eq(integrations.provider, 'procore')))
      .limit(1);

    if (existing) {
      await db.update(integrations).set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        updatedAt: new Date(),
      }).where(eq(integrations.id, existing.id));
    } else {
      await db.insert(integrations).values({
        userId: session.user.id,
        provider: 'procore',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      });
    }

    const response = NextResponse.redirect(new URL('/integrations?connected=procore', request.url));
    response.cookies.delete('procore_oauth_state');
    return response;
  } catch (error) {
    console.error('Procore callback error:', error);
    return NextResponse.redirect(new URL('/integrations?error=procore_callback_failed', request.url));
  }
}
