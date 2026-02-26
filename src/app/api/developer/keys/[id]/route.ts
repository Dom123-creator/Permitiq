import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb, apiKeys } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE /api/developer/keys/[id] — revoke a key
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  const { id } = await params;
  try {
    const db = getDb();
    const [updated] = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, session.user.id)))
      .returning({ id: apiKeys.id });

    if (!updated) return NextResponse.json({ error: 'API key not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/developer/keys/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}
