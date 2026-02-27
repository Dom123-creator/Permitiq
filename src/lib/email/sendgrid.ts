/**
 * SendGrid email client.
 *
 * Set in .env.local:
 *   SENDGRID_API_KEY=SG.xxxx
 *   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
 *   SENDGRID_FROM_NAME=PermitIQ
 */

interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL ?? 'noreply@permitiq.app';
  const fromName = process.env.SENDGRID_FROM_NAME ?? 'PermitIQ';

  if (!apiKey) {
    console.log('[SendGrid] SENDGRID_API_KEY not set — email not sent:', opts.subject, '→', opts.to);
    return false;
  }

  const body = {
    personalizations: [
      {
        to: [{ email: opts.to, ...(opts.toName ? { name: opts.toName } : {}) }],
      },
    ],
    from: { email: fromEmail, name: fromName },
    subject: opts.subject,
    content: [
      ...(opts.text ? [{ type: 'text/plain', value: opts.text }] : []),
      { type: 'text/html', value: opts.html },
    ],
  };

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[SendGrid] Send failed:', res.status, err);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[SendGrid] Send error:', err);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SENDGRID_API_KEY);
}

// ── Email templates ────────────────────────────────────────────────────────

export function inviteEmailHtml(opts: {
  inviterName: string;
  inviteUrl: string;
  role: string;
  companyName?: string;
}): string {
  const company = opts.companyName ?? 'PermitIQ';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0d12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e8edf5">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0d12;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111620;border:1px solid #1e2a3d;border-radius:12px;overflow:hidden">
        <!-- Header -->
        <tr><td style="background:#00e5ff;padding:6px 0"></td></tr>
        <tr><td style="padding:32px 40px 24px">
          <div style="font-size:22px;font-weight:700;color:#e8edf5;margin-bottom:8px">${company}</div>
          <div style="font-size:14px;color:#5a6a85">Permit tracking & management</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:0 40px 32px">
          <p style="font-size:16px;color:#e8edf5;margin:0 0 16px">
            You've been invited to join <strong>${company}</strong> as a <strong>${opts.role}</strong>.
          </p>
          <p style="font-size:14px;color:#5a6a85;margin:0 0 32px">
            Click the button below to set up your account. This link expires in 7 days.
          </p>
          <a href="${opts.inviteUrl}"
             style="display:inline-block;background:#00e5ff;color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none">
            Accept Invitation
          </a>
          <p style="font-size:12px;color:#5a6a85;margin:24px 0 0">
            Or copy this link: <a href="${opts.inviteUrl}" style="color:#00e5ff">${opts.inviteUrl}</a>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid #1e2a3d">
          <p style="font-size:12px;color:#5a6a85;margin:0">
            ${company} · Permit Intelligence Platform<br>
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

export function emailDraftHtml(opts: {
  subject: string;
  body: string;
  recipientName?: string;
}): string {
  // Convert markdown-ish body to basic HTML
  const htmlBody = opts.body
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#333">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #ddd;border-radius:8px;overflow:hidden">
        <tr><td style="background:#00e5ff;padding:4px 0"></td></tr>
        <tr><td style="padding:28px 36px">
          <p style="font-size:15px;color:#333;line-height:1.7;margin:0"><p>${htmlBody}</p></p>
        </td></tr>
        <tr><td style="padding:16px 36px;border-top:1px solid #eee;font-size:12px;color:#999">
          Sent via PermitIQ · Permit Tracking & Management
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
