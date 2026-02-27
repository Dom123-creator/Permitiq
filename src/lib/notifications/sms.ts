/**
 * SMS notification client via Twilio.
 *
 * Set in .env.local:
 *   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_PHONE_NUMBER=+15551234567
 */

export async function sendSMS(toNumber: string, body: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) return false;

  // Strip markdown formatting for plain SMS
  const plainText = body
    .replace(/\*([^*]+)\*/g, '$1')   // **bold** → plain
    .replace(/_([^_]+)_/g, '$1')     // _italic_ → plain
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url) → link text
    .replace(/#{1,6}\s/g, '')         // headers → plain
    .trim();

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: toNumber,
          Body: plainText.slice(0, 1600), // Twilio max
        }).toString(),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      console.error('[SMS] Twilio error:', err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[SMS] Send error:', err);
    return false;
  }
}

export function isSMSConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}
