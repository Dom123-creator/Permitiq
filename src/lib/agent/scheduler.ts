/**
 * Proactive agent scheduler using node-cron.
 *
 * Schedule:
 *   - 8:00 AM daily       → Daily digest (summary pushed to all active users)
 *   - Every 2 hours       → Critical scan (overdue, expiry, info-request deadlines)
 *   - 7:00 PM daily       → Inspection reminder (tomorrow's inspections)
 *
 * Started once via src/instrumentation.ts on server boot.
 * Guards against double-start (idempotent).
 */

let started = false;

export async function startScheduler(): Promise<void> {
  if (started) return;
  started = true;

  // Dynamic import so this file is safe to import in edge/non-Node environments
  // (Next.js instrumentation runs in Node.js only)
  let cron: typeof import('node-cron');
  try {
    cron = await import('node-cron');
  } catch {
    console.warn('[scheduler] node-cron not available — skipping scheduler startup');
    return;
  }

  const { runFullScan, runDailyDigest, checkUpcomingInspections } = await import(
    './proactiveScanner'
  );

  // 8:00 AM daily — digest
  cron.schedule('0 8 * * *', async () => {
    console.log('[scheduler] Running daily digest...');
    await runDailyDigest();
  });

  // Every 2 hours — critical checks (overdue, expiry, deadlines, today's tasks)
  cron.schedule('0 */2 * * *', async () => {
    console.log('[scheduler] Running critical scan...');
    const result = await runFullScan();
    console.log('[scheduler] Scan complete:', result);
  });

  // 7:00 PM daily — tomorrow inspection reminder
  cron.schedule('0 19 * * *', async () => {
    console.log('[scheduler] Running inspection reminder...');
    await checkUpcomingInspections();
  });

  console.log('[scheduler] Started — digest @ 8AM, scans every 2h, inspection reminder @ 7PM');
}
