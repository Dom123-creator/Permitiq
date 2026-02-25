import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards';
import { syncProcore } from '@/lib/integrations/procore';
import { getDb, auditLog } from '@/lib/db';

// POST /api/integrations/procore/sync — sync projects and permits from Procore
export async function POST(request: NextRequest) {
  const sessionOrError = await requireRole(['owner', 'admin']);
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  try {
    const { companyId, projectId } = await request.json();

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const result = await syncProcore(session.user.id, Number(companyId), projectId ? Number(projectId) : undefined);

    // Write audit log
    const db = getDb();
    await db.insert(auditLog).values({
      actorType: 'user',
      actorId: session.user.id,
      action: 'procore_sync',
      newValue: JSON.stringify({
        projectsCreated: result.projectsCreated,
        permitsCreated: result.permitsCreated,
        errors: result.errors.length,
      }),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/integrations/procore/sync failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
