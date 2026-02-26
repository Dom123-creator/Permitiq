import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, registeredWebhooks } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

const VALID_EVENTS = [
  'permit.updated',
  'permit.approved',
  'permit.archived',
  'task.created',
  'task.completed',
  'inspection.result',
  '*',
];

// GET /api/developer/webhooks — list webhooks for current user
export async function GET(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: registeredWebhooks.id,
        url: registeredWebhooks.url,
        events: registeredWebhooks.events,
        active: registeredWebhooks.active,
        failureCount: registeredWebhooks.failureCount,
        lastDeliveryAt: registeredWebhooks.lastDeliveryAt,
        createdAt: registeredWebhooks.createdAt,
      })
      .from(registeredWebhooks)
      .where(eq(registeredWebhooks.userId, session.user.id))
      .orderBy(desc(registeredWebhooks.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/developer/webhooks failed:', error);
    return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
  }
}

const createSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1).refine(
    (evs) => evs.every((e) => VALID_EVENTS.includes(e)),
    { message: `Events must be one of: ${VALID_EVENTS.join(', ')}` }
  ),
});

// POST /api/developer/webhooks — register a new webhook (secret shown once)
export async function POST(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const secret = `whsec_${randomBytes(24).toString('hex')}`;

    const db = getDb();
    const [row] = await db
      .insert(registeredWebhooks)
      .values({
        userId: session.user.id,
        url: parsed.data.url,
        events: JSON.stringify(parsed.data.events),
        secret,
        active: true,
        failureCount: 0,
      })
      .returning({
        id: registeredWebhooks.id,
        url: registeredWebhooks.url,
        events: registeredWebhooks.events,
        active: registeredWebhooks.active,
        createdAt: registeredWebhooks.createdAt,
      });

    // Return secret ONCE — never retrievable again
    return NextResponse.json({ ...row, secret }, { status: 201 });
  } catch (error) {
    console.error('POST /api/developer/webhooks failed:', error);
    return NextResponse.json({ error: 'Failed to register webhook' }, { status: 500 });
  }
}
