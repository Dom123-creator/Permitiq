import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createHmac, timingSafeEqual } from 'crypto';
import { getDb, permits, auditLog } from '@/lib/db';

// POST /api/webhooks/zapier — receive permit status updates from Zapier
// No session auth — HMAC-only authentication
export async function POST(request: NextRequest) {
  const secret = process.env.ZAPIER_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  // Read raw body FIRST (before any JSON.parse) so HMAC is over raw bytes
  const rawBody = await request.text();

  const signature = request.headers.get('x-zapier-signature') ?? '';
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;

  // Constant-time comparison to prevent timing attacks
  let valid = false;
  try {
    valid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    valid = false;
  }

  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody) as {
      permitId?: string;
      status?: string;
      notes?: string;
    };

    if (!body.permitId || !body.status) {
      return NextResponse.json({ error: 'permitId and status are required' }, { status: 400 });
    }

    const db = getDb();

    const [existing] = await db
      .select({ id: permits.id, status: permits.status })
      .from(permits)
      .where(eq(permits.id, body.permitId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 });
    }

    await db.update(permits).set({
      status: body.status,
      notes: body.notes ?? undefined,
      updatedAt: new Date(),
    }).where(eq(permits.id, body.permitId));

    await db.insert(auditLog).values({
      permitId: body.permitId,
      actorType: 'agent',
      action: 'status_changed',
      oldValue: existing.status,
      newValue: body.status,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/webhooks/zapier failed:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
