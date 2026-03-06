/**
 * Saved Filter Presets API
 *
 * GET  /api/filters — List current user's saved filters
 * POST /api/filters — Save a new filter preset
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { getDb, savedFilters } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

export async function GET() {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(savedFilters)
      .where(eq(savedFilters.userId, sessionOrError.user.id))
      .orderBy(asc(savedFilters.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/filters failed:', error);
    return NextResponse.json({ error: 'Failed to fetch filters' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const body = await request.json();
    if (!body.name || !body.filters) {
      return NextResponse.json({ error: 'name and filters are required' }, { status: 400 });
    }

    const db = getDb();
    const [created] = await db.insert(savedFilters).values({
      userId: sessionOrError.user.id,
      name: body.name,
      filters: typeof body.filters === 'string' ? body.filters : JSON.stringify(body.filters),
      isDefault: body.isDefault ?? false,
    }).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/filters failed:', error);
    return NextResponse.json({ error: 'Failed to save filter' }, { status: 500 });
  }
}
