import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, permits, projects } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth/apiKeyAuth';
import { requireAuth } from '@/lib/auth/guards';

// GET /api/v1/permits — paginated permit list
export async function GET(request: NextRequest) {
  // Accept either API key or session cookie
  const apiSession = await verifyApiKey(request);
  if (!apiSession) {
    const sessionOrError = await requireAuth();
    if (sessionOrError instanceof NextResponse) return sessionOrError;
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const status = searchParams.get('status');
  const offset = (page - 1) * limit;

  try {
    const db = getDb();

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
        expiryDate: permits.expiryDate,
        submittedAt: permits.submittedAt,
        projectId: permits.projectId,
        projectName: projects.name,
        createdAt: permits.createdAt,
        updatedAt: permits.updatedAt,
      })
      .from(permits)
      .leftJoin(projects, eq(permits.projectId, projects.id))
      .where(
        and(
          eq(permits.archived, false),
          status ? eq(permits.status, status) : undefined,
        )
      )
      .orderBy(desc(permits.createdAt))
      .limit(limit)
      .offset(offset);

    // Count total
    const countResult = await db
      .select({ count: permits.id })
      .from(permits)
      .where(
        and(
          eq(permits.archived, false),
          status ? eq(permits.status, status) : undefined,
        )
      );

    return NextResponse.json({
      data: rows,
      meta: { total: countResult.length, page, limit },
    });
  } catch (error) {
    console.error('GET /api/v1/permits failed:', error);
    return NextResponse.json({ error: 'Failed to fetch permits' }, { status: 500 });
  }
}
