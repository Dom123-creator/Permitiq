/**
 * POST /api/telegram/webhook — receives incoming Telegram Bot messages.
 *
 * Supported user commands (sent as plain text or slash commands):
 *   /start  — link Telegram account, save chat ID to user record
 *   /status — send current permit + task counts
 *   /urgent — list urgent-priority pending tasks
 *   /tasks  — list all pending tasks (up to 10)
 *   /stop   — disable Telegram notifications
 *
 * Security: Telegram sends a secret_token header when the webhook is
 * registered with setWebhook?secret_token=... — verify this to prevent spoofing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, ne, and } from 'drizzle-orm';
import { getDb, users, permits, tasks } from '@/lib/db';
import { sendTelegramMessage } from '@/lib/notifications/telegram';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    from?: { id: number; first_name: string; username?: string };
    text?: string;
  };
}

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = request.headers.get('x-telegram-bot-api-secret-token');
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json() as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const msg = update.message;
  if (!msg?.text || !msg.from) {
    return NextResponse.json({ ok: true }); // ignore non-text updates
  }

  const chatId = String(msg.chat.id);
  const text = msg.text.trim().toLowerCase();
  const firstName = msg.from.first_name;

  try {
    const db = getDb();

    // /start — link this Telegram chat to the user account matching Telegram user ID
    // Users must have sent their chat ID or we match by existing telegramChatId
    if (text === '/start' || text.startsWith('/start ')) {
      // Check if this chatId is already linked
      const [existingUser] = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.telegramChatId, chatId))
        .limit(1);

      if (existingUser) {
        await sendTelegramMessage(
          chatId,
          `✅ *Already Connected*\nHey ${existingUser.name}! Your PermitIQ account is linked.\n\nCommands:\n/status — permit summary\n/urgent — urgent tasks\n/tasks — all tasks\n/stop — unsubscribe`
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `👋 *Welcome to PermitIQ Bot!*\n\nTo link your account, go to:\n*Settings → Notifications*\n\nEnter this Chat ID: \`${chatId}\`\n\nThen save your notification preferences.`
        );
      }
      return NextResponse.json({ ok: true });
    }

    // All other commands require a linked account
    const [user] = await db
      .select({ id: users.id, name: users.name, notificationChannel: users.notificationChannel })
      .from(users)
      .where(eq(users.telegramChatId, chatId))
      .limit(1);

    if (!user) {
      await sendTelegramMessage(
        chatId,
        `❌ Account not linked.\n\nSend /start to get your Chat ID, then enter it in PermitIQ Settings → Notifications.`
      );
      return NextResponse.json({ ok: true });
    }

    if (text === '/status') {
      const allPermits = await db
        .select({ status: permits.status, daysInQueue: permits.daysInQueue })
        .from(permits)
        .where(eq(permits.archived, false));

      const active = allPermits.filter(
        (p) => p.status !== 'approved' && p.status !== 'rejected'
      );
      const overdue = active.filter((p) => (p.daysInQueue ?? 0) >= 20);
      const approved = allPermits.filter((p) => p.status === 'approved');

      const pendingTasks = await db
        .select({ id: tasks.id, priority: tasks.priority })
        .from(tasks)
        .where(ne(tasks.status, 'completed'));

      const urgentCount = pendingTasks.filter((t) => t.priority === 'urgent').length;

      await sendTelegramMessage(
        chatId,
        `📊 *PermitIQ Status*\n\n` +
        `📋 Active permits: ${active.length}\n` +
        `✅ Approved: ${approved.length}\n` +
        (overdue.length > 0 ? `⚠️ Overdue: ${overdue.length}\n` : '') +
        `\n📌 Pending tasks: ${pendingTasks.length}` +
        (urgentCount > 0 ? ` (${urgentCount} urgent 🚨)` : '')
      );

    } else if (text === '/urgent') {
      const urgentTasks = await db
        .select({ id: tasks.id, title: tasks.title })
        .from(tasks)
        .where(
          and(
            ne(tasks.status, 'completed'),
            eq(tasks.priority, 'urgent')
          )
        )
        .limit(10);

      if (urgentTasks.length === 0) {
        await sendTelegramMessage(chatId, `✅ *No urgent tasks!* All clear.`);
      } else {
        const list = urgentTasks.map((t, i) => `${i + 1}. ${t.title}`).join('\n');
        await sendTelegramMessage(
          chatId,
          `🚨 *${urgentTasks.length} Urgent Tasks*\n\n${list}`
        );
      }

    } else if (text === '/tasks') {
      const pendingTasks = await db
        .select({ id: tasks.id, title: tasks.title, priority: tasks.priority })
        .from(tasks)
        .where(ne(tasks.status, 'completed'))
        .limit(10);

      if (pendingTasks.length === 0) {
        await sendTelegramMessage(chatId, `✅ *No pending tasks!* Inbox zero.`);
      } else {
        const list = pendingTasks.map((t) => {
          const emoji = t.priority === 'urgent' ? '🚨' : t.priority === 'high' ? '⚠️' : '•';
          return `${emoji} ${t.title}`;
        }).join('\n');
        await sendTelegramMessage(
          chatId,
          `📌 *Pending Tasks (${pendingTasks.length})*\n\n${list}`
        );
      }

    } else if (text === '/stop') {
      await db
        .update(users)
        .set({ notificationChannel: 'none' })
        .where(eq(users.id, user.id));

      await sendTelegramMessage(
        chatId,
        `🔕 Notifications disabled. Re-enable in PermitIQ Settings → Notifications.`
      );

    } else {
      await sendTelegramMessage(
        chatId,
        `Commands:\n/status — permit summary\n/urgent — urgent tasks\n/tasks — pending tasks\n/stop — unsubscribe`
      );
    }
  } catch (err) {
    console.error('[telegram webhook] error:', err);
  }

  return NextResponse.json({ ok: true });
}
