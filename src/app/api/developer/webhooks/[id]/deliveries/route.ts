import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, registeredWebhooks, webhookDeliveries } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/developer/webhooks/[id]/deliveries — last 50 delivery records
export async function GET(request: NextRequest, { params }: RouteParams) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  const { id } = await params;
  try {
    const db = getDb();

    // Verify the webhook belongs to this user
    const [webhook] = await db
      .select({ id: registeredWebhooks.id })
      .from(registeredWebhooks)
      .where(and(eq(registeredWebhooks.id, id), eq(registeredWebhooks.userId, session.user.id)))
      .limit(1);

    if (!webhook) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });

    const deliveries = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, id))
      .orderBy(desc(webhookDeliveries.attemptedAt))
      .limit(50);

    return NextResponse.json(deliveries);
  } catch (error) {
    console.error('GET /api/developer/webhooks/[id]/deliveries failed:', error);
    return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 });
  }
}
