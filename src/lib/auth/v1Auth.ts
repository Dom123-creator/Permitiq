import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from './apiKeyAuth';
import { requireAuth } from './guards';
import { rateLimit } from '@/lib/rateLimit';

export interface V1Session {
  userId: string;
  scopes: string[];          // ['read'] | ['read','write']
  authMethod: 'apikey' | 'session';
}

/**
 * Authenticate a /api/v1/ request using either:
 *   - Bearer API key (piq_...)  → API key auth
 *   - Session cookie            → NextAuth session
 *
 * Also applies a sliding-window rate limit (100 req/min per unique key/user).
 *
 * Returns a V1Session on success, or a NextResponse (401 / 429) on failure.
 */
export async function requireV1Auth(
  request: NextRequest,
): Promise<V1Session | NextResponse> {
  // 1. Try API key first
  const apiSession = await verifyApiKey(request);

  let userId: string;
  let scopes: string[];
  let authMethod: 'apikey' | 'session';
  let rateLimitKey: string;

  if (apiSession) {
    userId = apiSession.userId;
    scopes = apiSession.scopes;
    authMethod = 'apikey';
    rateLimitKey = `apikey:${apiSession.keyId}`;
  } else {
    // 2. Fall back to session cookie
    const sessionOrError = await requireAuth();
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    userId = sessionOrError.user.id;
    scopes = ['read', 'write']; // session users have full access
    authMethod = 'session';
    rateLimitKey = `session:${userId}`;
  }

  // 3. Rate limiting — 100 requests per minute per key/user
  const limit = rateLimit(rateLimitKey, { windowMs: 60_000, max: 100 });

  const rlHeaders = {
    'X-RateLimit-Limit': String(limit.limit),
    'X-RateLimit-Remaining': String(limit.remaining),
    'X-RateLimit-Reset': String(limit.resetAt),
  };

  if (!limit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.', retryAfter: limit.resetAt },
      {
        status: 429,
        headers: {
          ...rlHeaders,
          'Retry-After': String(limit.resetAt),
        },
      },
    );
  }

  return { userId, scopes, authMethod };
}
