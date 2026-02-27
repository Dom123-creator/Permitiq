/**
 * Telegram Bot notification client.
 *
 * Uses the Telegram Bot API (no SDK needed — plain fetch).
 * Set TELEGRAM_BOT_TOKEN in .env.local.
 *
 * To create a bot: message @BotFather on Telegram → /newbot
 * To get a user's chat ID: they message your bot, you see their ID in the webhook payload,
 *   OR instruct them to message @userinfobot.
 */

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: 'Markdown' | 'HTML' | 'MarkdownV2' = 'Markdown'
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[Telegram] sendMessage failed:', err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Telegram] sendMessage error:', err);
    return false;
  }
}

/**
 * Register a webhook URL with Telegram so the bot can receive replies.
 * Call this once at setup: POST /api/telegram/setup
 */
export async function registerTelegramWebhook(webhookUrl: string, secret?: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  try {
    const body: Record<string, string> = { url: webhookUrl };
    if (secret) body.secret_token = secret;

    const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}
