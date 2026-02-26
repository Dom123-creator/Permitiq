import { createHash } from 'crypto';
import { eq, isNull } from 'drizzle-orm';
import { getDb, apiKeys } from '@/lib/db';

export interface ApiKeySession {
  userId: string;
  scopes: string[];
  keyId: string;
}

/**
 * Verify an API key from the Authorization: Bearer header.
 * Returns the key session or null if invalid/revoked.
 */
export async function verifyApiKey(request: Request): Promise<ApiKeySession | null> {
  const authHeader = request.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer piq_')) return null;

  const rawKey = authHeader.slice('Bearer '.length).trim();
  if (!rawKey.startsWith('piq_')) return null;

  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash))
      .limit(1);

    if (!row) return null;
    if (row.revokedAt !== null) return null;

    // Update lastUsedAt (fire-and-forget)
    db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, row.id))
      .catch(() => {});

    return {
      userId: row.userId,
      scopes: row.scopes.split(',').map((s) => s.trim()),
      keyId: row.id,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a key session has a specific scope.
 */
export function hasScope(session: ApiKeySession, scope: string): boolean {
  return session.scopes.includes(scope) || session.scopes.includes('read,write');
}
