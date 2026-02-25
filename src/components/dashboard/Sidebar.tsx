'use client';

import { useState, useEffect } from 'react';

interface Stats {
  permitsTotal: number;
  awaitingResponse: number;
  overdue: number;
  tasksInQueue: number;
  expiringPermits: ExpiringPermit[];
  projects: Project[];
}

interface Project {
  id: string;
  name: string;
  status: string;
  permitCount: number;
}

interface ExpiringPermit {
  id: string;
  name: string;
  daysUntil: number;
  projectName: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-success',
  'on-hold': 'bg-warn',
  completed: 'bg-muted',
};

function getExpiryColor(days: number): string {
  if (days <= 7) return 'text-danger';
  if (days <= 30) return 'text-danger';
  if (days <= 60) return 'text-warn';
  return 'text-accent';
}

function getExpiryBg(days: number): string {
  if (days <= 30) return 'bg-danger/20';
  if (days <= 60) return 'bg-warn/20';
  return 'bg-accent/20';
}

function getExpiryLabel(days: number): string {
  if (days <= 7) return 'Critical';
  if (days <= 30) return 'Urgent';
  if (days <= 60) return 'Warning';
  return 'Caution';
}

function StatCard({
  value,
  label,
  accentClass,
  loading,
}: {
  value: number;
  label: string;
  accentClass: string;
  loading: boolean;
}) {
  return (
    <div className={`stat-card border-t-2 ${accentClass}`}>
      {loading ? (
        <div className="h-8 w-8 rounded bg-surface2 animate-pulse mb-1" />
      ) : (
        <div className="text-2xl font-bold text-text">{value}</div>
      )}
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

export function Sidebar() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setStats(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const projects = stats?.projects ?? [];
  const expiringPermits = stats?.expiringPermits ?? [];
  const criticalCount = expiringPermits.filter((p) => p.daysUntil <= 30).length;

  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col">
      {/* Stat Cards */}
      <div className="p-4 border-b border-border">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            value={stats?.permitsTotal ?? 0}
            label="Permits Tracked"
            accentClass="border-t-accent"
            loading={loading}
          />
          <StatCard
            value={stats?.awaitingResponse ?? 0}
            label="Awaiting Response"
            accentClass="border-t-warn"
            loading={loading}
          />
          <StatCard
            value={stats?.overdue ?? 0}
            label="Overdue"
            accentClass="border-t-danger"
            loading={loading}
          />
          <StatCard
            value={stats?.tasksInQueue ?? 0}
            label="Tasks in Queue"
            accentClass="border-t-purple"
            loading={loading}
          />
        </div>
      </div>

      {/* Expiry Countdown Widget */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">
            Expiring Soon
          </h2>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-danger/20 text-danger text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
              {criticalCount}
            </span>
          )}
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-surface2 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && expiringPermits.length === 0 && (
          <p className="text-xs text-muted text-center py-3">No permits expiring within 90 days</p>
        )}

        {!loading && expiringPermits.length > 0 && (
          <div className="space-y-2">
            {expiringPermits.slice(0, 4).map((permit) => (
              <div
                key={permit.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-card border border-border hover:border-muted transition-colors cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getExpiryBg(permit.daysUntil)}`}>
                  <span className={`text-sm font-bold ${getExpiryColor(permit.daysUntil)}`}>
                    {permit.daysUntil}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text truncate">{permit.name}</p>
                  <p className="text-xs text-muted truncate">{permit.projectName}</p>
                </div>
                <div className={`text-xs font-medium flex-shrink-0 ${getExpiryColor(permit.daysUntil)}`}>
                  {getExpiryLabel(permit.daysUntil)}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && expiringPermits.length > 4 && (
          <button className="w-full mt-2 text-xs text-accent hover:underline text-center">
            +{expiringPermits.length - 4} more expiring permits
          </button>
        )}
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-auto p-4">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
          Projects
        </h2>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-surface2 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && (
          <div className="space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedProject(project.id === selectedProject ? null : project.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedProject === project.id
                    ? 'bg-surface2 border-accent'
                    : 'bg-card border-border hover:border-muted'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text truncate">
                    {project.name}
                  </span>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ml-2 ${statusColors[project.status] ?? 'bg-muted'}`} />
                </div>
                <div className="text-xs text-muted">
                  {project.permitCount} permit{project.permitCount !== 1 ? 's' : ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-border">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
          Quick Actions
        </h2>
        <div className="space-y-2">
          <button className="btn btn-primary w-full justify-start gap-2">
            <span>+</span>
            <span>Add Permit</span>
          </button>
          <button className="btn btn-secondary w-full justify-start gap-2">
            <span>+</span>
            <span>New Project</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
