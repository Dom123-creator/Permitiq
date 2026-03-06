/**
 * DELETE /api/filters/[id] — Delete a saved filter preset
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb, savedFilters } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const { id } = await params;
  try {
    const db = getDb();
    const [deleted] = await db
      .delete(savedFilters)
      .where(and(eq(savedFilters.id, id), eq(savedFilters.userId, sessionOrError.user.id)))
      .returning();

    if (!deleted) return NextResponse.json({ error: 'Filter not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/filters/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to delete filter' }, { status: 500 });
  }
}
