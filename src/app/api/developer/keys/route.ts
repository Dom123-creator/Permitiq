import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { eq, isNull, desc } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, apiKeys } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

// GET /api/developer/keys — list keys for current user (never expose raw key)
export async function GET(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        scopes: apiKeys.scopes,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, session.user.id))
      .orderBy(desc(apiKeys.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/developer/keys failed:', error);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.enum(['read', 'read,write']).default('read'),
});

// POST /api/developer/keys — create a new API key (raw key returned once)
export async function POST(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    // Generate: piq_ + 32 random hex chars
    const rawKey = `piq_${randomBytes(16).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 8); // "piq_ab12"

    const db = getDb();
    const [row] = await db
      .insert(apiKeys)
      .values({
        userId: session.user.id,
        name: parsed.data.name,
        keyHash,
        keyPrefix,
        scopes: parsed.data.scopes,
      })
      .returning({ id: apiKeys.id, name: apiKeys.name, keyPrefix: apiKeys.keyPrefix, scopes: apiKeys.scopes, createdAt: apiKeys.createdAt });

    // Return raw key ONCE — never stored, never retrievable again
    return NextResponse.json({ ...row, key: rawKey }, { status: 201 });
  } catch (error) {
    console.error('POST /api/developer/keys failed:', error);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}
