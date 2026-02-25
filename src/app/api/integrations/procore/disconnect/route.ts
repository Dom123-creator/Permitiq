import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/guards';
import { getDb, integrations } from '@/lib/db';

// DELETE /api/integrations/procore/disconnect
export async function DELETE() {
  const sessionOrError = await requireRole(['owner', 'admin']);
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  try {
    const db = getDb();
    await db.delete(integrations).where(
      and(eq(integrations.userId, session.user.id), eq(integrations.provider, 'procore'))
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/integrations/procore/disconnect failed:', error);
    return NextResponse.json({ error: 'Failed to disconnect Procore' }, { status: 500 });
  }
}
