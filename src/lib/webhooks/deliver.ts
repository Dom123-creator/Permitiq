import { createHmac, randomUUID } from 'crypto';
import { eq, and, sql } from 'drizzle-orm';
import { getDb, registeredWebhooks, webhookDeliveries } from '@/lib/db';

const MAX_FAILURES = 10;

/**
 * Deliver a webhook event to all registered subscribers.
 * Fire-and-forget — call with Promise.allSettled, never await in route handler.
 */
export async function deliverWebhookEvent(event: string, payload: object): Promise<void> {
  let db;
  try {
    db = getDb();
  } catch {
    return; // DB not configured — skip silently
  }

  // Find active webhooks subscribed to this event
  const webhooks = await db
    .select()
    .from(registeredWebhooks)
    .where(eq(registeredWebhooks.active, true));

  const matching = webhooks.filter((wh) => {
    try {
      const events: string[] = JSON.parse(wh.events);
      return events.includes(event) || events.includes('*');
    } catch {
      return false;
    }
  });

  if (matching.length === 0) return;

  const payloadStr = JSON.stringify({ event, data: payload });
  const deliveryId = randomUUID();
  const timestamp = Date.now().toString();

  await Promise.allSettled(
    matching.map(async (wh) => {
      const sig = `sha256=${createHmac('sha256', wh.secret).update(payloadStr).digest('hex')}`;

      let responseStatus: number | null = null;
      let responseBody: string | null = null;
      let success = false;

      try {
        const res = await fetch(wh.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-permitiq-signature': sig,
            'x-permitiq-event': event,
            'x-permitiq-delivery': deliveryId,
            'x-permitiq-timestamp': timestamp,
          },
          body: payloadStr,
          signal: AbortSignal.timeout(10_000),
        });

        responseStatus = res.status;
        responseBody = (await res.text()).slice(0, 1000);
        success = res.status >= 200 && res.status < 300;
      } catch (err) {
        responseBody = err instanceof Error ? err.message : 'Unknown error';
      }

      // Record delivery
      await db.insert(webhookDeliveries).values({
        webhookId: wh.id,
        event,
        payload: payloadStr,
        responseStatus,
        responseBody,
        success,
      });

      // Update lastDeliveryAt + failureCount
      const newFailureCount = success ? 0 : (wh.failureCount ?? 0) + 1;
      const shouldDisable = newFailureCount >= MAX_FAILURES;

      await db
        .update(registeredWebhooks)
        .set({
          lastDeliveryAt: new Date(),
          failureCount: newFailureCount,
          active: shouldDisable ? false : wh.active,
        })
        .where(eq(registeredWebhooks.id, wh.id));
    })
  );
}
