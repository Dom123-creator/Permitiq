import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, and } from 'drizzle-orm';
import { getDb, auditLog, permits, projects, users } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

function buildDescription(
  action: string,
  oldValue: string | null,
  newValue: string | null
): string {
  switch (action) {
    case 'status_changed':
      return `Status changed${oldValue ? ` from "${oldValue}"` : ''} to "${newValue ?? '?'}"`;
    case 'inspection_result_set':
      return `Inspection result set to "${newValue ?? '?'}"${oldValue ? ` (was "${oldValue}")` : ''}`;
    case 'task_created':
      return newValue ?? 'Task auto-created';
    case 'permit_archived':
      return 'Permit archived';
    case 'permit_unarchived':
      return 'Permit unarchived';
    case 'rule_triggered':
      return newValue ?? 'Rule triggered';
    default:
      // Fallback: use newValue, then oldValue, then humanize the action name
      return (
        newValue ??
        oldValue ??
        action
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
      );
  }
}

function buildActorName(
  actorType: string,
  userNameFromJoin: string | null
): string {
  if (actorType === 'agent') return 'PermitIQ Agent';
  if (userNameFromJoin) return userNameFromJoin;
  return 'User';
}

// GET /api/audit?permitId=&actorType=&action=&limit=100&offset=0
export async function GET(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const { searchParams } = new URL(request.url);
    const permitId = searchParams.get('permitId');
    const actorType = searchParams.get('actorType');
    const action = searchParams.get('action');
    const limit = Math.min(Number(searchParams.get('limit') ?? '100'), 200);
    const offset = Number(searchParams.get('offset') ?? '0');

    const db = getDb();

    const conditions = [
      permitId ? eq(auditLog.permitId, permitId) : undefined,
      actorType ? eq(auditLog.actorType, actorType) : undefined,
      action ? eq(auditLog.action, action) : undefined,
    ].filter(Boolean) as Parameters<typeof and>;

    const rows = await db
      .select({
        id: auditLog.id,
        permitId: auditLog.permitId,
        actorType: auditLog.actorType,
        actorId: auditLog.actorId,
        action: auditLog.action,
        oldValue: auditLog.oldValue,
        newValue: auditLog.newValue,
        timestamp: auditLog.timestamp,
        permitName: permits.name,
        projectName: projects.name,
        userName: users.name,
      })
      .from(auditLog)
      .leftJoin(permits, eq(auditLog.permitId, permits.id))
      .leftJoin(projects, eq(permits.projectId, projects.id))
      .leftJoin(users, eq(auditLog.actorId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLog.timestamp))
      .limit(limit)
      .offset(offset);

    const enriched = rows.map((r) => ({
      id: r.id,
      permitId: r.permitId,
      permitName: r.permitName ?? null,
      projectName: r.projectName ?? null,
      actorType: r.actorType,
      actorId: r.actorId,
      actorName: buildActorName(r.actorType, r.userName),
      action: r.action,
      description: buildDescription(r.action, r.oldValue, r.newValue),
      oldValue: r.oldValue,
      newValue: r.newValue,
      timestamp: r.timestamp,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('GET /api/audit failed:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }
}
