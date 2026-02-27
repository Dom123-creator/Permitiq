/**
 * POST /api/telegram/setup — Register the Telegram webhook URL with BotFather.
 * Call once after deploying: POST /api/telegram/setup
 * Auth: owner only.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { registerTelegramWebhook } from '@/lib/notifications/telegram';

export async function POST() {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  if (session.user.role !== 'owner') {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 });
  }

  const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? process.env.FRONTEND_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: 'AUTH_URL not set' }, { status: 500 });
  }

  const webhookUrl = `${baseUrl}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  const ok = await registerTelegramWebhook(webhookUrl, secret);
  if (!ok) {
    return NextResponse.json({ error: 'Failed to register webhook — check TELEGRAM_BOT_TOKEN' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, webhookUrl });
}
