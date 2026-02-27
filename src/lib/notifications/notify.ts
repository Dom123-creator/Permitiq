/**
 * Unified notification dispatcher.
 *
 * Routes messages to Telegram and/or SMS based on each user's notificationChannel setting.
 * Always fire-and-forget — never await in a route handler.
 *
 * Usage:
 *   void notifyUser(userId, 'permit.status', message);
 *   void notifyAllActiveUsers('daily.digest', message);
 */

import { eq, and, ne } from 'drizzle-orm';
import { getDb, users } from '@/lib/db';
import { sendTelegramMessage } from './telegram';
import { sendSMS } from './sms';

export type NotifyEvent =
  | 'permit.status'
  | 'permit.approved'
  | 'inspection.fail'
  | 'inspection.result'
  | 'expiry'
  | 'deadline'
  | 'daily.digest'
  | 'task.created'
  | 'system';

/**
 * Send a notification to a specific user (by DB user ID).
 * Respects the user's channel and event preferences.
 */
export async function notifyUser(
  userId: string,
  event: NotifyEvent,
  message: string
): Promise<void> {
  try {
    const db = getDb();
    const [user] = await db
      .select({
        telegramChatId: users.telegramChatId,
        phoneNumber: users.phoneNumber,
        notificationChannel: users.notificationChannel,
        notifyEvents: users.notifyEvents,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return;
    if (!user.notificationChannel || user.notificationChannel === 'none') return;

    // Check if this event type is in the user's subscription list
    const subscribedEvents: string[] = user.notifyEvents
      ? (JSON.parse(user.notifyEvents) as string[])
      : [];

    // system events always go through regardless of subscription
    if (event !== 'system' && !subscribedEvents.includes(event)) return;

    const sends: Promise<boolean>[] = [];

    if (
      (user.notificationChannel === 'telegram' || user.notificationChannel === 'both') &&
      user.telegramChatId
    ) {
      sends.push(sendTelegramMessage(user.telegramChatId, message));
    }

    if (
      (user.notificationChannel === 'sms' || user.notificationChannel === 'both') &&
      user.phoneNumber
    ) {
      sends.push(sendSMS(user.phoneNumber, message));
    }

    await Promise.allSettled(sends);
  } catch (err) {
    console.error('[notify] notifyUser error:', err);
  }
}

/**
 * Send a notification to all active users who have notifications configured.
 * Used for scheduled digests and broadcast alerts.
 */
export async function notifyAllActiveUsers(
  event: NotifyEvent,
  messageBuilder: (user: { name: string }) => string
): Promise<void> {
  try {
    const db = getDb();
    const activeUsers = await db
      .select({
        id: users.id,
        name: users.name,
        telegramChatId: users.telegramChatId,
        phoneNumber: users.phoneNumber,
        notificationChannel: users.notificationChannel,
        notifyEvents: users.notifyEvents,
      })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          ne(users.notificationChannel, 'none')
        )
      );

    for (const user of activeUsers) {
      if (!user.notificationChannel || user.notificationChannel === 'none') continue;

      const subscribedEvents: string[] = user.notifyEvents
        ? (JSON.parse(user.notifyEvents) as string[])
        : [];

      if (event !== 'system' && !subscribedEvents.includes(event)) continue;

      const message = messageBuilder({ name: user.name });
      const sends: Promise<boolean>[] = [];

      if (
        (user.notificationChannel === 'telegram' || user.notificationChannel === 'both') &&
        user.telegramChatId
      ) {
        sends.push(sendTelegramMessage(user.telegramChatId, message));
      }

      if (
        (user.notificationChannel === 'sms' || user.notificationChannel === 'both') &&
        user.phoneNumber
      ) {
        sends.push(sendSMS(user.phoneNumber, message));
      }

      await Promise.allSettled(sends);
    }
  } catch (err) {
    console.error('[notify] notifyAllActiveUsers error:', err);
  }
}

/**
 * Send a notification to all owner and admin users.
 * Used for high-severity alerts.
 */
export async function notifyAdmins(
  event: NotifyEvent,
  message: string
): Promise<void> {
  try {
    const db = getDb();
    const admins = await db
      .select({
        id: users.id,
        name: users.name,
        telegramChatId: users.telegramChatId,
        phoneNumber: users.phoneNumber,
        notificationChannel: users.notificationChannel,
        notifyEvents: users.notifyEvents,
      })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          ne(users.notificationChannel, 'none')
        )
      );

    const ownerAdmins = admins.filter((u) => {
      // All users who have notifications configured get admin alerts
      return u.notificationChannel && u.notificationChannel !== 'none';
    });

    for (const user of ownerAdmins) {
      await notifyUser(user.id, event, message);
    }
  } catch (err) {
    console.error('[notify] notifyAdmins error:', err);
  }
}
