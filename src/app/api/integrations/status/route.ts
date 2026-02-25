import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guards';
import { getDb, integrations } from '@/lib/db';

// GET /api/integrations/status — connection status for all integrations (never returns token values)
export async function GET() {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  try {
    const db = getDb();

    const [procoreRow] = await db
      .select({
        createdAt: integrations.createdAt,
        updatedAt: integrations.updatedAt,
        providerData: integrations.providerData,
      })
      .from(integrations)
      .where(and(eq(integrations.userId, session.user.id), eq(integrations.provider, 'procore')))
      .limit(1);

    let lastSync: string | null = null;
    let companyId: number | null = null;
    if (procoreRow?.providerData) {
      try {
        const data = JSON.parse(procoreRow.providerData);
        lastSync = data.lastSync ?? null;
        companyId = data.companyId ?? null;
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      procore: {
        connected: !!procoreRow,
        connectedAt: procoreRow?.createdAt ?? null,
        lastSync,
        companyId,
      },
      buildertrend: {
        lastImport: null, // tracked via audit log — future enhancement
      },
      zapier: {
        active: !!process.env.ZAPIER_WEBHOOK_SECRET,
        webhookUrl: `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/webhooks/zapier`,
      },
    });
  } catch (error) {
    console.error('GET /api/integrations/status failed:', error);
    return NextResponse.json({ error: 'Failed to fetch integration status' }, { status: 500 });
  }
}
