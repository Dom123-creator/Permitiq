import { NextResponse } from 'next/server';
import { eq, ne, sql, and } from 'drizzle-orm';
import { getDb, permits, projects, tasks } from '@/lib/db';

// Jurisdiction → average review days (mirrors the permit route)
const JURISDICTION_AVG: Record<string, number> = {
  Houston: 15,
  'Harris County': 20,
  Austin: 18,
  Dallas: 16,
  'San Antonio': 14,
};
const DEFAULT_AVG = 15;

function avgForPermit(jurisdiction: string, type: string): number {
  const base = JURISDICTION_AVG[jurisdiction] ?? DEFAULT_AVG;
  return type === 'Fire' ? base + 5 : base;
}

function daysInQueue(submittedAt: Date | null, stored: number | null): number {
  if (!submittedAt) return stored ?? 0;
  return Math.max(0, Math.floor((Date.now() - new Date(submittedAt).getTime()) / 86_400_000));
}

// GET /api/dashboard/stats
export async function GET() {
  try {
    const db = getDb();
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 86_400_000);

    // All active permits (not archived)
    const allPermits = await db
      .select({
        id: permits.id,
        name: permits.name,
        type: permits.type,
        jurisdiction: permits.jurisdiction,
        status: permits.status,
        daysInQueueStored: permits.daysInQueue,
        submittedAt: permits.submittedAt,
        expiryDate: permits.expiryDate,
        projectId: permits.projectId,
        projectName: projects.name,
      })
      .from(permits)
      .leftJoin(projects, eq(permits.projectId, projects.id))
      .where(eq(permits.archived, false));

    // Tasks in queue (non-completed)
    const [{ tasksInQueue }] = await db
      .select({ tasksInQueue: sql<number>`cast(count(*) as int)` })
      .from(tasks)
      .where(ne(tasks.status, 'completed'));

    // Compute stats in JS so we can apply per-jurisdiction avg logic
    let awaitingResponse = 0;
    let overdue = 0;
    const expiringPermits: {
      id: string;
      name: string;
      daysUntil: number;
      projectName: string;
    }[] = [];

    for (const p of allPermits) {
      if (p.status === 'info-requested') awaitingResponse++;

      const days = daysInQueue(p.submittedAt, p.daysInQueueStored);
      const avg = avgForPermit(p.jurisdiction, p.type);
      if (days > avg && p.status !== 'approved' && p.status !== 'rejected') overdue++;

      if (p.expiryDate) {
        const expiry = new Date(p.expiryDate);
        if (expiry <= in90Days && expiry > now) {
          const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
          expiringPermits.push({
            id: p.id,
            name: p.name,
            daysUntil,
            projectName: p.projectName ?? 'Unknown',
          });
        }
      }
    }

    // Sort expiring: soonest first
    expiringPermits.sort((a, b) => a.daysUntil - b.daysUntil);

    // Projects with permit counts
    const projectRows = await db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        permitCount: sql<number>`cast(count(${permits.id}) as int)`,
      })
      .from(projects)
      .leftJoin(
        permits,
        and(eq(permits.projectId, projects.id), eq(permits.archived, false))
      )
      .groupBy(projects.id)
      .orderBy(projects.name);

    return NextResponse.json({
      permitsTotal: allPermits.length,
      awaitingResponse,
      overdue,
      tasksInQueue,
      expiringPermits,
      projects: projectRows,
    });
  } catch (error) {
    console.error('GET /api/dashboard/stats failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
