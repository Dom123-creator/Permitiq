/**
 * GET  /api/settings/notifications — get current user's notification prefs
 * PATCH /api/settings/notifications — update channel, events, phone, telegram chat ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, users } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';
import { sendTelegramMessage } from '@/lib/notifications/telegram';
import { sendSMS } from '@/lib/notifications/sms';

export async function GET() {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  const db = getDb();
  const [user] = await db
    .select({
      telegramChatId: users.telegramChatId,
      phoneNumber: users.phoneNumber,
      notificationChannel: users.notificationChannel,
      notifyEvents: users.notifyEvents,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({
    telegramChatId: user.telegramChatId ?? '',
    phoneNumber: user.phoneNumber ?? '',
    notificationChannel: user.notificationChannel ?? 'none',
    notifyEvents: user.notifyEvents
      ? (JSON.parse(user.notifyEvents) as string[])
      : [],
  });
}

export async function PATCH(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  const body = await request.json() as {
    notificationChannel?: string;
    notifyEvents?: string[];
    telegramChatId?: string;
    phoneNumber?: string;
    sendTest?: boolean;
  };

  const allowed = ['telegram', 'sms', 'both', 'none'];
  if (body.notificationChannel && !allowed.includes(body.notificationChannel)) {
    return NextResponse.json({ error: 'Invalid notificationChannel' }, { status: 400 });
  }

  const db = getDb();
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if ('notificationChannel' in body) updates.notificationChannel = body.notificationChannel;
  if ('notifyEvents' in body)
    updates.notifyEvents = JSON.stringify(body.notifyEvents ?? []);
  if ('telegramChatId' in body) updates.telegramChatId = body.telegramChatId || null;
  if ('phoneNumber' in body) updates.phoneNumber = body.phoneNumber || null;

  await db.update(users).set(updates).where(eq(users.id, session.user.id));

  // Optionally send a test message immediately after saving
  if (body.sendTest) {
    const testMsg = '✅ PermitIQ notifications connected! You will receive permit alerts here.';

    if (
      (body.notificationChannel === 'telegram' || body.notificationChannel === 'both') &&
      body.telegramChatId
    ) {
      void sendTelegramMessage(body.telegramChatId, testMsg);
    }

    if (
      (body.notificationChannel === 'sms' || body.notificationChannel === 'both') &&
      body.phoneNumber
    ) {
      void sendSMS(body.phoneNumber, testMsg);
    }
  }

  return NextResponse.json({ ok: true });
}
