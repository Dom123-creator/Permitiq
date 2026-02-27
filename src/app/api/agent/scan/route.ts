/**
 * POST /api/agent/scan — Trigger a proactive scan manually or via Vercel Cron.
 *
 * Auth: owner/admin session OR x-cron-secret header (for Vercel Cron jobs).
 * Body: { type: 'full' | 'digest' | 'inspections' }  (default: 'full')
 *
 * Add to vercel.json crons config:
 *   path: /api/agent/scan, schedule: "0 every-2h * * *"
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { runFullScan, runDailyDigest, checkUpcomingInspections } from '@/lib/agent/proactiveScanner';

export async function POST(request: NextRequest) {
  // Allow Vercel Cron via secret header
  const cronSecret = request.headers.get('x-cron-secret');
  if (cronSecret && cronSecret === process.env.CRON_SECRET) {
    // Authorized via cron secret — proceed without session
  } else {
    // Otherwise require owner/admin session
    const sessionOrError = await requireAuth();
    if (sessionOrError instanceof NextResponse) return sessionOrError;
    const session = sessionOrError;
    if (!['owner', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => ({})) as { type?: string };
  const scanType = body.type ?? 'full';

  try {
    if (scanType === 'digest') {
      await runDailyDigest();
      return NextResponse.json({ ok: true, type: 'digest' });
    }

    if (scanType === 'inspections') {
      await checkUpcomingInspections();
      return NextResponse.json({ ok: true, type: 'inspections' });
    }

    // Default: full scan
    const result = await runFullScan();
    return NextResponse.json({ ok: true, type: 'full', ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[scan route] failed:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
