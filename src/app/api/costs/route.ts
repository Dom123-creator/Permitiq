import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb, projects, permits } from '@/lib/db';

const JURISDICTION_AVG: Record<string, number> = {
  Houston: 15,
  'Harris County': 20,
  Austin: 18,
  Dallas: 16,
  'San Antonio': 14,
};

function avgDays(jurisdiction: string, type: string): number {
  const base = JURISDICTION_AVG[jurisdiction] ?? 15;
  return type === 'Fire' ? base + 5 : base;
}

function computeDaysInQueue(submittedAt: Date | null, stored: number | null): number {
  if (!submittedAt) return stored ?? 0;
  return Math.max(0, Math.floor((Date.now() - new Date(submittedAt).getTime()) / 86_400_000));
}

// GET /api/costs — all projects with per-permit delay cost data
export async function GET() {
  try {
    const db = getDb();

    const rows = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        projectClient: projects.client,
        projectStatus: projects.status,
        dailyCarryingCost: projects.dailyCarryingCost,
        permitId: permits.id,
        permitName: permits.name,
        permitStatus: permits.status,
        permitType: permits.type,
        jurisdiction: permits.jurisdiction,
        submittedAt: permits.submittedAt,
        daysInQueueStored: permits.daysInQueue,
        archived: permits.archived,
      })
      .from(projects)
      .leftJoin(
        permits,
        and(eq(permits.projectId, projects.id), eq(permits.archived, false))
      )
      .orderBy(projects.name, permits.name);

    // Group rows into projects
    const projectMap = new Map<string, {
      id: string;
      name: string;
      client: string | null;
      dailyCarryingCost: number;
      permits: {
        id: string;
        name: string;
        status: string;
        daysInQueue: number;
        avgDays: number;
        daysOverdue: number;
      }[];
    }>();

    for (const row of rows) {
      if (!projectMap.has(row.projectId)) {
        projectMap.set(row.projectId, {
          id: row.projectId,
          name: row.projectName,
          client: row.projectClient ?? null,
          dailyCarryingCost: Number(row.dailyCarryingCost) || 0,
          permits: [],
        });
      }

      // Skip null permitId rows (project with no permits from LEFT JOIN)
      if (!row.permitId || !row.permitName || !row.permitStatus || !row.jurisdiction || !row.permitType) continue;

      const daysInQueue = computeDaysInQueue(row.submittedAt, row.daysInQueueStored);
      const avg = avgDays(row.jurisdiction, row.permitType);

      // Approved/rejected permits are no longer accumulating delays
      const isFinished = row.permitStatus === 'approved' || row.permitStatus === 'rejected';
      const daysOverdue = isFinished ? 0 : Math.max(0, daysInQueue - avg);

      projectMap.get(row.projectId)!.permits.push({
        id: row.permitId,
        name: row.permitName,
        status: row.permitStatus,
        daysInQueue,
        avgDays: avg,
        daysOverdue,
      });
    }

    return NextResponse.json(Array.from(projectMap.values()));
  } catch (error) {
    console.error('GET /api/costs failed:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch cost data' }, { status: 500 });
  }
}
