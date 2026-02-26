import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, registeredWebhooks } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const patchSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  active: z.boolean().optional(),
});

// PATCH /api/developer/webhooks/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const db = getDb();
    const updates: Record<string, unknown> = {};
    if (parsed.data.url !== undefined) updates.url = parsed.data.url;
    if (parsed.data.events !== undefined) updates.events = JSON.stringify(parsed.data.events);
    if (parsed.data.active !== undefined) {
      updates.active = parsed.data.active;
      if (parsed.data.active) updates.failureCount = 0; // reset failures on re-enable
    }

    const [updated] = await db
      .update(registeredWebhooks)
      .set(updates)
      .where(and(eq(registeredWebhooks.id, id), eq(registeredWebhooks.userId, session.user.id)))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/developer/webhooks/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 });
  }
}

// DELETE /api/developer/webhooks/[id]
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  const { id } = await params;
  try {
    const db = getDb();
    const [deleted] = await db
      .delete(registeredWebhooks)
      .where(and(eq(registeredWebhooks.id, id), eq(registeredWebhooks.userId, session.user.id)))
      .returning({ id: registeredWebhooks.id });

    if (!deleted) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/developer/webhooks/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
  }
}
