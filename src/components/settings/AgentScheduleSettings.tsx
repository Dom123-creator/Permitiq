'use client';

import { useState } from 'react';

const SCHEDULES = [
  {
    id: 'digest',
    name: 'Daily Digest',
    description: 'Summary of all permit activity pushed to all active users',
    schedule: '8:00 AM daily',
    cron: '0 8 * * *',
  },
  {
    id: 'full',
    name: 'Critical Scan',
    description: 'Check overdue permits, expiry warnings, info-request deadlines, tasks due today',
    schedule: 'Every 2 hours',
    cron: '0 */2 * * *',
  },
  {
    id: 'inspections',
    name: 'Inspection Reminder',
    description: "Remind users about tomorrow's scheduled inspections",
    schedule: '7:00 PM daily',
    cron: '0 19 * * *',
  },
];

export function AgentScheduleSettings() {
  const [running, setRunning] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ id: string; ok: boolean; message: string } | null>(null);

  const triggerScan = async (type: string) => {
    setRunning(type);
    setLastResult(null);
    try {
      const res = await fetch('/api/agent/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      setLastResult({
        id: type,
        ok: res.ok,
        message: res.ok ? 'Completed successfully' : (data.error ?? 'Failed'),
      });
    } catch {
      setLastResult({ id: type, ok: false, message: 'Network error' });
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-1">
        <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-base font-semibold text-text">Agent Schedule</h2>
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Active
        </span>
      </div>
      <p className="text-sm text-muted mb-5 ml-8">
        The PermitIQ agent runs on a fixed schedule. You can trigger any scan manually below.
      </p>

      <div className="space-y-3 ml-8">
        {SCHEDULES.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between p-4 bg-surface2 rounded-xl border border-border"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text">{s.name}</span>
                <code className="text-xs text-muted bg-bg px-1.5 py-0.5 rounded">{s.schedule}</code>
              </div>
              <p className="text-xs text-muted mt-0.5">{s.description}</p>
              {lastResult?.id === s.id && (
                <p className={`text-xs mt-1 ${lastResult.ok ? 'text-success' : 'text-danger'}`}>
                  {lastResult.message}
                </p>
              )}
            </div>
            <button
              onClick={() => triggerScan(s.id)}
              disabled={running !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {running === s.id ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Running…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run Now
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted mt-4 ml-8">
        Schedules are managed via server-side cron. Contact your admin to change timing.
      </p>
    </div>
  );
}
