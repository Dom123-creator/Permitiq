import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gte, desc } from 'drizzle-orm';
import { getDb, inspections, permits, projects } from '@/lib/db';

// GET /api/inspections?permitId=&upcoming=true
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const permitId = searchParams.get('permitId');
    const upcomingOnly = searchParams.get('upcoming') === 'true';

    const db = getDb();
    const now = new Date();

    const rows = await db
      .select({
        id: inspections.id,
        permitId: inspections.permitId,
        type: inspections.type,
        scheduledDate: inspections.scheduledDate,
        result: inspections.result,
        inspectorName: inspections.inspectorName,
        inspectorContact: inspections.inspectorContact,
        notes: inspections.notes,
        createdAt: inspections.createdAt,
        permitName: permits.name,
        permitType: permits.type,
        projectName: projects.name,
        projectId: permits.projectId,
      })
      .from(inspections)
      .leftJoin(permits, eq(inspections.permitId, permits.id))
      .leftJoin(projects, eq(permits.projectId, projects.id))
      .where(
        and(
          permitId ? eq(inspections.permitId, permitId) : undefined,
          upcomingOnly ? gte(inspections.scheduledDate, now) : undefined,
        )
      )
      .orderBy(inspections.scheduledDate);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/inspections failed:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch inspections' }, { status: 500 });
  }
}

// POST /api/inspections — schedule a new inspection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { permitId, type, scheduledDate, inspectorName, inspectorContact, notes } = body;

    if (!permitId || !type) {
      return NextResponse.json({ error: 'permitId and type are required' }, { status: 400 });
    }

    const db = getDb();
    const [inspection] = await db
      .insert(inspections)
      .values({
        permitId,
        type,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        result: null,
        inspectorName: inspectorName ?? null,
        inspectorContact: inspectorContact ?? null,
        notes: notes ?? null,
      })
      .returning();

    return NextResponse.json(inspection, { status: 201 });
  } catch (error) {
    console.error('POST /api/inspections failed:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to schedule inspection' }, { status: 500 });
  }
}
