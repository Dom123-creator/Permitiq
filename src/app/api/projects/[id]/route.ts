import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, projects } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/projects/[id] — update project fields (dailyCarryingCost, status, etc.)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const body = await request.json();
    const db = getDb();

    const [existing] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if ('dailyCarryingCost' in body) {
      const val = body.dailyCarryingCost;
      updates.dailyCarryingCost = val === null ? null : String(Number(val));
    }
    if ('status' in body) updates.status = body.status;
    if ('client' in body) updates.client = body.client;

    const [updated] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/projects/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}
