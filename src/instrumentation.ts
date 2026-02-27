/**
 * Next.js instrumentation hook — runs once on server startup.
 * Used to start the proactive agent scheduler.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('./lib/agent/scheduler');
    await startScheduler();
  }
}
