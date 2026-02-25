'use client';

import { useState, useEffect } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Kpis {
  totalActivePermits: number;
  overduePermits: number;
  totalDelayCost: number;
  avgDaysInQueue: number;
  approvalRate: number;
  feeVariance: number;
  pendingTasks: number;
  totalPermits: number;
}

interface StatusBucket { status: string; count: number; pct: number }
interface SubmissionPipeline { draft: number; submitted: number; underReview: number; correctionsRequired: number; approved: number }
interface JurisdictionStat { jurisdiction: string; count: number; avgDays: number; benchmark: number; overdueCount: number }
interface PermitTypeStat { type: string; count: number; avgDays: number; approvalRate: number }
interface ProjectHealth { id: string; name: string; client: string | null; permitCount: number; overdueCount: number; delayCost: number; inspectionPassRate: number | null; dailyCarryingCost: number }
interface ActivityEntry { id: string; action: string; oldValue: string | null; newValue: string | null; timestamp: string; actorType: string; permitName: string | null; projectName: string | null; actorName: string }

interface AnalyticsData {
  kpis: Kpis;
  statusDistribution: StatusBucket[];
  submissionPipeline: SubmissionPipeline;
  jurisdictions: JurisdictionStat[];
  permitTypes: PermitTypeStat[];
  projectHealth: ProjectHealth[];
  recentActivity: ActivityEntry[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtRelative(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function actionLabel(action: string, newValue: string | null): string {
  switch (action) {
    case 'status_changed': return `Status → ${newValue ?? ''}`;
    case 'submission_status_changed': return `Submission → ${newValue ?? ''}`;
    case 'inspection_result_set': return `Inspection: ${newValue ?? ''}`;
    case 'task_created': return 'Task created';
    case 'permit_archived': return 'Permit archived';
    case 'rule_triggered': return 'Rule triggered';
    default: return action.replace(/_/g, ' ');
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bar: string }> = {
  pending:        { label: 'Pending',        color: 'text-purple',  bar: 'bg-purple' },
  'under-review': { label: 'Under Review',   color: 'text-accent',  bar: 'bg-accent' },
  'info-requested': { label: 'Info Requested', color: 'text-warn',  bar: 'bg-warn' },
  approved:       { label: 'Approved',       color: 'text-success', bar: 'bg-success' },
  rejected:       { label: 'Rejected',       color: 'text-danger',  bar: 'bg-danger' },
};

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent, danger, warn }: {
  label: string; value: string; sub?: string;
  accent?: boolean; danger?: boolean; warn?: boolean;
}) {
  const borderColor = danger ? 'border-t-danger' : warn ? 'border-t-warn' : accent ? 'border-t-accent' : 'border-t-border';
  const valueColor = danger ? 'text-danger' : warn ? 'text-warn' : accent ? 'text-accent' : 'text-text';
  return (
    <div className={`bg-card border border-border border-t-2 ${borderColor} rounded-xl p-4`}>
      <div className="text-xs text-muted uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}

// ── Bar chart row ─────────────────────────────────────────────────────────────

function BarRow({ label, value, max, color, suffix = '', sub }: {
  label: string; value: number; max: number; color: string; suffix?: string; sub?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-xs text-text truncate flex-shrink-0">{label}</div>
      <div className="flex-1 h-5 bg-surface2 rounded overflow-hidden">
        <div
          className={`h-full ${color} rounded transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-muted w-20 text-right flex-shrink-0">
        {value}{suffix}{sub && <span className="ml-1 text-muted/60">{sub}</span>}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted text-sm">
        Loading analytics…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-24 text-danger text-sm">
        {error || 'No data available'}
      </div>
    );
  }

  const { kpis, statusDistribution, submissionPipeline, jurisdictions, permitTypes, projectHealth, recentActivity } = data;

  const maxJurDays = Math.max(...jurisdictions.map((j) => Math.max(j.avgDays, j.benchmark)), 1);
  const maxTypeCount = Math.max(...permitTypes.map((t) => t.count), 1);
  const pipelineMax = Math.max(
    kpis.totalPermits, 1
  );

  const pipelineStages = [
    { key: 'draft', label: 'Draft', count: submissionPipeline.draft, color: 'bg-muted' },
    { key: 'submitted', label: 'Submitted', count: submissionPipeline.submitted, color: 'bg-accent' },
    { key: 'underReview', label: 'Under Review', count: submissionPipeline.underReview, color: 'bg-purple' },
    { key: 'correctionsRequired', label: 'Corrections', count: submissionPipeline.correctionsRequired, color: 'bg-warn' },
    { key: 'approved', label: 'Approved', count: submissionPipeline.approved, color: 'bg-success' },
  ];

  return (
    <div className="space-y-6">

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <KpiCard
          label="Active Permits"
          value={String(kpis.totalActivePermits)}
          sub={`${kpis.totalPermits} total`}
          accent
        />
        <KpiCard
          label="Overdue"
          value={String(kpis.overduePermits)}
          sub="past jurisdiction avg"
          danger={kpis.overduePermits > 0}
        />
        <KpiCard
          label="Total Delay Cost"
          value={fmt$(kpis.totalDelayCost)}
          sub="carrying cost × overdue days"
          danger={kpis.totalDelayCost > 0}
        />
        <KpiCard
          label="Avg Queue Time"
          value={`${kpis.avgDaysInQueue}d`}
          sub="active permits"
          warn={kpis.avgDaysInQueue > 18}
        />
        <KpiCard
          label="Approval Rate"
          value={`${kpis.approvalRate}%`}
          sub="of all permits"
          accent={kpis.approvalRate >= 50}
        />
        <KpiCard
          label="Fee Variance"
          value={fmt$(Math.abs(kpis.feeVariance))}
          sub={kpis.feeVariance >= 0 ? 'over budget' : 'under budget'}
          danger={kpis.feeVariance > 0}
          accent={kpis.feeVariance <= 0}
        />
        <KpiCard
          label="Open Tasks"
          value={String(kpis.pendingTasks)}
          sub="not completed"
          warn={kpis.pendingTasks > 10}
        />
      </div>

      {/* ── Row 2: Status Distribution + Submission Pipeline ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Status distribution */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm font-semibold text-text mb-4">Permit Status Distribution</div>
          <div className="space-y-3">
            {statusDistribution.map((s) => {
              const cfg = STATUS_CONFIG[s.status] ?? { label: s.status, color: 'text-muted', bar: 'bg-muted' };
              return (
                <div key={s.status} className="flex items-center gap-3">
                  <div className={`w-28 text-xs font-medium flex-shrink-0 ${cfg.color}`}>{cfg.label}</div>
                  <div className="flex-1 h-5 bg-surface2 rounded overflow-hidden">
                    <div className={`h-full ${cfg.bar} opacity-80 rounded`} style={{ width: `${s.pct}%` }} />
                  </div>
                  <div className="text-xs text-muted w-16 text-right flex-shrink-0">{s.count} ({s.pct}%)</div>
                </div>
              );
            })}
            {statusDistribution.length === 0 && (
              <p className="text-xs text-muted text-center py-4">No permit data yet</p>
            )}
          </div>
        </div>

        {/* Submission pipeline */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm font-semibold text-text mb-4">Submission Pipeline</div>
          <div className="flex items-end gap-2 h-28 mb-3">
            {pipelineStages.map((stage) => {
              const h = pipelineMax > 0 ? Math.round((stage.count / pipelineMax) * 100) : 0;
              return (
                <div key={stage.key} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs text-muted font-medium">{stage.count}</div>
                  <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                    <div
                      className={`w-full ${stage.color} opacity-80 rounded-t transition-all duration-700`}
                      style={{ height: `${Math.max(h, stage.count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            {pipelineStages.map((stage) => (
              <div key={stage.key} className="flex-1 text-center text-xs text-muted truncate">{stage.label}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Jurisdiction Velocity + Permit Types ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Jurisdiction velocity */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm font-semibold text-text mb-1">Permit Velocity by Jurisdiction</div>
          <div className="text-xs text-muted mb-4">Actual avg days vs jurisdiction benchmark</div>
          <div className="space-y-4">
            {jurisdictions.map((j) => (
              <div key={j.jurisdiction}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-text">{j.jurisdiction}</span>
                  <span className={`text-xs font-medium ${j.avgDays > j.benchmark ? 'text-danger' : 'text-success'}`}>
                    {j.avgDays}d <span className="text-muted font-normal">/ {j.benchmark}d avg</span>
                  </span>
                </div>
                <div className="relative h-4 bg-surface2 rounded overflow-hidden">
                  {/* Benchmark marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-muted/40 z-10"
                    style={{ left: `${Math.round((j.benchmark / maxJurDays) * 100)}%` }}
                  />
                  {/* Actual bar */}
                  <div
                    className={`h-full rounded ${j.avgDays > j.benchmark ? 'bg-danger/60' : 'bg-success/60'} transition-all duration-700`}
                    style={{ width: `${Math.round((j.avgDays / maxJurDays) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-muted">{j.count} permit{j.count !== 1 ? 's' : ''}</span>
                  {j.overdueCount > 0 && (
                    <span className="text-xs text-danger">{j.overdueCount} overdue</span>
                  )}
                </div>
              </div>
            ))}
            {jurisdictions.length === 0 && (
              <p className="text-xs text-muted text-center py-4">No permit data yet</p>
            )}
          </div>
        </div>

        {/* Permit type breakdown */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm font-semibold text-text mb-1">Permit Type Breakdown</div>
          <div className="text-xs text-muted mb-4">Volume and average processing time</div>
          <div className="space-y-3">
            {permitTypes.map((t) => (
              <BarRow
                key={t.type}
                label={t.type}
                value={t.count}
                max={maxTypeCount}
                color="bg-accent/60"
                suffix=" permits"
                sub={`${t.avgDays}d avg`}
              />
            ))}
            {permitTypes.length === 0 && (
              <p className="text-xs text-muted text-center py-4">No permit data yet</p>
            )}
          </div>
          {permitTypes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2">
              {permitTypes.map((t) => (
                <div key={t.type} className="flex items-center justify-between">
                  <span className="text-xs text-muted">{t.type}</span>
                  <span className={`text-xs font-medium ${t.approvalRate >= 50 ? 'text-success' : 'text-warn'}`}>
                    {t.approvalRate}% approved
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Project Health Table ───────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-sm font-semibold text-text mb-4">Project Health</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted uppercase tracking-wide">Project</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted uppercase tracking-wide">Client</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-muted uppercase tracking-wide">Permits</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-muted uppercase tracking-wide">Overdue</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted uppercase tracking-wide">Delay Cost</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted uppercase tracking-wide">Daily Rate</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-muted uppercase tracking-wide">Insp Pass</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted uppercase tracking-wide">Health</th>
              </tr>
            </thead>
            <tbody>
              {projectHealth.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted">No project data</td>
                </tr>
              ) : (
                projectHealth.map((p) => {
                  const healthScore = p.permitCount === 0 ? 100
                    : Math.round(((p.permitCount - p.overdueCount) / p.permitCount) * 100);
                  const healthColor = healthScore >= 80 ? 'bg-success' : healthScore >= 50 ? 'bg-warn' : 'bg-danger';
                  return (
                    <tr key={p.id} className="border-b border-border hover:bg-surface2 transition-colors">
                      <td className="py-3 px-3 text-sm text-text font-medium">{p.name}</td>
                      <td className="py-3 px-3 text-xs text-muted">{p.client ?? '—'}</td>
                      <td className="py-3 px-3 text-center text-sm text-text">{p.permitCount}</td>
                      <td className="py-3 px-3 text-center">
                        {p.overdueCount > 0
                          ? <span className="text-xs font-medium text-danger">{p.overdueCount}</span>
                          : <span className="text-xs text-success">0</span>
                        }
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`text-sm font-medium ${p.delayCost > 0 ? 'text-danger' : 'text-muted'}`}>
                          {p.delayCost > 0 ? fmt$(p.delayCost) : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-xs text-muted">
                        {p.dailyCarryingCost > 0 ? `${fmt$(p.dailyCarryingCost)}/d` : '—'}
                      </td>
                      <td className="py-3 px-3 text-center text-xs">
                        {p.inspectionPassRate !== null
                          ? <span className={p.inspectionPassRate >= 70 ? 'text-success' : 'text-warn'}>{p.inspectionPassRate}%</span>
                          : <span className="text-muted">—</span>
                        }
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-surface2 rounded overflow-hidden">
                            <div className={`h-full ${healthColor} rounded`} style={{ width: `${healthScore}%` }} />
                          </div>
                          <span className="text-xs text-muted w-8">{healthScore}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Row 5: Recent Activity ────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-sm font-semibold text-text mb-4">Recent Activity</div>
        <div className="space-y-2">
          {recentActivity.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">No activity recorded yet</p>
          ) : (
            recentActivity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.actorType === 'agent' ? 'bg-accent' : 'bg-purple'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text">{actionLabel(a.action, a.newValue)}</span>
                    {a.permitName && (
                      <span className="text-xs text-muted truncate">— {a.permitName}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {a.actorName}
                    {a.projectName && ` · ${a.projectName}`}
                  </div>
                </div>
                <div className="text-xs text-muted flex-shrink-0">{fmtRelative(a.timestamp)}</div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
