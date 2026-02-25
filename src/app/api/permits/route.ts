import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import { getDb, permits, projects, documents, inspections, fees, projectMembers } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

// Jurisdiction average review days — used to colour-code days-in-queue
const JURISDICTION_AVG: Record<string, number> = {
  Houston: 15,
  'Harris County': 20,
  Austin: 18,
  Dallas: 16,
  'San Antonio': 14,
};
const DEFAULT_AVG = 15;

function avgDays(jurisdiction: string, type: string): number {
  // Type-specific overrides
  if (type === 'Fire') return (JURISDICTION_AVG[jurisdiction] ?? DEFAULT_AVG) + 5;
  return JURISDICTION_AVG[jurisdiction] ?? DEFAULT_AVG;
}

function computeDaysInQueue(submittedAt: Date | null, stored: number | null): number {
  if (!submittedAt) return stored ?? 0;
  const ms = Date.now() - new Date(submittedAt).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

// GET /api/permits?projectId=&status=&archived=false
export async function GET(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const showArchived = searchParams.get('archived') === 'true';

    const db = getDb();

    // Project scoping for non-admin/owner roles
    let scopedProjectIds: string[] | null = null;
    if (!['owner', 'admin'].includes(session.user.role)) {
      const memberships = await db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, session.user.id));
      scopedProjectIds = memberships.map((m) => m.projectId);
      if (scopedProjectIds.length === 0) return NextResponse.json([]);
    }

    const rows = await db
      .select({
        id: permits.id,
        name: permits.name,
        type: permits.type,
        jurisdiction: permits.jurisdiction,
        authority: permits.authority,
        permitNumber: permits.permitNumber,
        status: permits.status,
        daysInQueue: permits.daysInQueue,
        submittedAt: permits.submittedAt,
        expiryDate: permits.expiryDate,
        feeBudgeted: permits.feeBudgeted,
        feeActual: permits.feeActual,
        notes: permits.notes,
        archived: permits.archived,
        projectId: permits.projectId,
        submissionStatus: permits.submissionStatus,
        submissionDeadline: permits.submissionDeadline,
        projectName: projects.name,
        createdAt: permits.createdAt,
        documentCount: sql<number>`cast(count(distinct ${documents.id}) as int)`,
        inspectionCount: sql<number>`cast(count(distinct ${inspections.id}) as int)`,
        inspectionsPassed: sql<number>`cast(count(distinct case when ${inspections.result} = 'pass' then ${inspections.id} end) as int)`,
        feeCount: sql<number>`cast(count(distinct ${fees.id}) as int)`,
      })
      .from(permits)
      .leftJoin(projects, eq(permits.projectId, projects.id))
      .leftJoin(documents, eq(documents.permitId, permits.id))
      .leftJoin(inspections, eq(inspections.permitId, permits.id))
      .leftJoin(fees, eq(fees.permitId, permits.id))
      .where(
        and(
          eq(permits.archived, showArchived),
          projectId ? eq(permits.projectId, projectId) : undefined,
          status ? eq(permits.status, status) : undefined,
          scopedProjectIds ? inArray(permits.projectId, scopedProjectIds) : undefined,
        )
      )
      .groupBy(permits.id, projects.name)
      .orderBy(desc(permits.createdAt));

    // Enrich with computed fields
    const enriched = rows.map((r) => ({
      ...r,
      daysInQueue: computeDaysInQueue(r.submittedAt, r.daysInQueue),
      avgDays: avgDays(r.jurisdiction, r.type),
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('GET /api/permits failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch permits' }, { status: 500 });
  }
}

// POST /api/permits — create a new permit
export async function POST(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const body = await request.json();
    const { projectId, name, type, jurisdiction, authority, permitNumber, notes, feeBudgeted, expiryDate } = body;

    if (!projectId || !name || !type || !jurisdiction) {
      return NextResponse.json(
        { error: 'projectId, name, type, and jurisdiction are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const [permit] = await db
      .insert(permits)
      .values({
        projectId,
        name,
        type,
        jurisdiction,
        authority: authority ?? null,
        permitNumber: permitNumber ?? null,
        status: 'pending',
        submittedAt: new Date(),
        notes: notes ?? null,
        feeBudgeted: feeBudgeted ?? null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      })
      .returning();

    return NextResponse.json(permit, { status: 201 });
  } catch (error) {
    console.error('POST /api/permits failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to create permit' }, { status: 500 });
  }
}
