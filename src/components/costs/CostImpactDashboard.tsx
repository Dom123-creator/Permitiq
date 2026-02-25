'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  PermitCostImpact,
  PortfolioCostSummary,
  formatCurrency,
  formatCurrencyCompact,
  costStatusConfig,
  calculateDelayCost,
  getCostStatus,
} from './CostTypes';

interface CostPermit {
  id: string;
  name: string;
  status: string;
  daysInQueue: number;
  avgDays: number;
  daysOverdue: number;
}

interface CostProject {
  id: string;
  name: string;
  client: string | null;
  dailyCarryingCost: number;
  permits: CostPermit[];
}

export function CostImpactDashboard() {
  const [projects, setProjects] = useState<CostProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Inline-edit state for daily carrying cost
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/costs')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setProjects(data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const startEdit = (project: CostProject) => {
    setEditingId(project.id);
    setEditValue(project.dailyCarryingCost > 0 ? String(project.dailyCarryingCost) : '');
  };

  const cancelEdit = () => { setEditingId(null); setEditValue(''); };

  const saveEdit = async (projectId: string) => {
    const val = Number(editValue);
    if (isNaN(val) || val < 0) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyCarryingCost: val }),
      });
      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) => p.id === projectId ? { ...p, dailyCarryingCost: val } : p)
        );
        setEditingId(null);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Permit-level cost impacts (only overdue permits)
  const permitCostImpacts = useMemo((): PermitCostImpact[] => {
    const impacts: PermitCostImpact[] = [];
    projects.forEach((project) => {
      project.permits.forEach((permit) => {
        if (permit.daysOverdue > 0) {
          const delayCost = calculateDelayCost(permit.daysOverdue, project.dailyCarryingCost);
          impacts.push({
            permitId: permit.id,
            permitName: permit.name,
            projectName: project.name,
            daysOverdue: permit.daysOverdue,
            dailyCarryingCost: project.dailyCarryingCost,
            totalDelayCost: delayCost,
            schedulePenaltyRisk: 0,
            status: getCostStatus(permit.daysOverdue),
          });
        }
      });
    });
    return impacts.sort((a, b) => b.totalDelayCost - a.totalDelayCost);
  }, [projects]);

  // Portfolio summary
  const portfolioSummary = useMemo((): PortfolioCostSummary => {
    const totalDelayCost = permitCostImpacts.reduce((sum, p) => sum + p.totalDelayCost, 0);
    const permitsAtRisk = permitCostImpacts.filter((p) => p.status === 'at-risk').length;
    const permitsCritical = permitCostImpacts.filter((p) => p.status === 'critical').length;
    const avgDaysOverdue =
      permitCostImpacts.length > 0
        ? permitCostImpacts.reduce((sum, p) => sum + p.daysOverdue, 0) / permitCostImpacts.length
        : 0;

    // Only count daily carrying cost for projects that have overdue permits
    const overdueProjectIds = new Set(permitCostImpacts.map((p) => p.projectName));
    const activeDailyCarrying = projects
      .filter((p) => overdueProjectIds.has(p.name))
      .reduce((sum, p) => sum + p.dailyCarryingCost, 0);

    return {
      totalDelayCost,
      totalSchedulePenaltyRisk: 0,
      permitsAtRisk,
      permitsCritical,
      avgDaysOverdue: Math.round(avgDaysOverdue),
      projectedMonthlyCost: activeDailyCarrying * 30,
    };
  }, [permitCostImpacts, projects]);

  // Project totals for the left panel
  const projectTotals = useMemo(() => {
    return projects.map((project) => {
      const projectImpacts = permitCostImpacts.filter((p) => p.projectName === project.name);
      const totalCost = projectImpacts.reduce((sum, p) => sum + p.totalDelayCost, 0);
      const overdueCount = projectImpacts.length;
      const status =
        overdueCount === 0
          ? 'on-track'
          : projectImpacts.some((p) => p.status === 'critical')
          ? 'critical'
          : 'at-risk';

      return { ...project, totalDelayCost: totalCost, overduePermits: overdueCount, status };
    }).sort((a, b) => b.totalDelayCost - a.totalDelayCost);
  }, [projects, permitCostImpacts]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Summary cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card border-t-2 border-t-border animate-pulse">
              <div className="h-8 w-16 bg-surface2 rounded mb-2" />
              <div className="h-3 w-24 bg-surface2 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="panel h-64 animate-pulse" />
          <div className="panel h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card border-t-2 border-t-danger">
          <div className="text-2xl font-bold text-danger">
            {formatCurrencyCompact(portfolioSummary.totalDelayCost)}
          </div>
          <div className="text-sm font-medium text-text mt-1">Total Delay Cost</div>
          <div className="text-xs text-muted">
            accumulated so far
          </div>
        </div>

        <div className="stat-card border-t-2 border-t-warn">
          <div className="text-2xl font-bold text-warn">
            {formatCurrencyCompact(portfolioSummary.projectedMonthlyCost)}
          </div>
          <div className="text-sm font-medium text-text mt-1">30-Day Projection</div>
          <div className="text-xs text-muted">
            if delays continue
          </div>
        </div>

        <div className="stat-card border-t-2 border-t-accent">
          <div className="text-2xl font-bold text-text">
            {portfolioSummary.permitsAtRisk + portfolioSummary.permitsCritical}
          </div>
          <div className="text-sm font-medium text-text mt-1">Permits Overdue</div>
          <div className="flex items-center gap-2 mt-1">
            {portfolioSummary.permitsCritical > 0 && (
              <span className="text-xs text-danger">{portfolioSummary.permitsCritical} critical</span>
            )}
            {portfolioSummary.permitsAtRisk > 0 && (
              <span className="text-xs text-warn">{portfolioSummary.permitsAtRisk} at risk</span>
            )}
            {portfolioSummary.permitsAtRisk + portfolioSummary.permitsCritical === 0 && (
              <span className="text-xs text-success">all on track</span>
            )}
          </div>
        </div>

        <div className="stat-card border-t-2 border-t-purple">
          <div className="text-2xl font-bold text-text">
            {portfolioSummary.avgDaysOverdue}d
          </div>
          <div className="text-sm font-medium text-text mt-1">Avg Days Overdue</div>
          <div className="text-xs text-muted">across delayed permits</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Cost by Project */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="text-sm font-semibold text-text">Cost by Project</h3>
            <span className="text-xs text-muted">Click to expand permits</span>
          </div>
          <div className="divide-y divide-border">
            {projectTotals.map((project) => {
              const isEditing = editingId === project.id;
              const isExpanded = selectedProject === project.id;

              return (
                <div key={project.id}>
                  <div
                    onClick={() => !isEditing && setSelectedProject(isExpanded ? null : project.id)}
                    className={`p-4 transition-colors ${
                      isEditing ? '' : 'cursor-pointer'
                    } ${isExpanded ? 'bg-surface2' : 'hover:bg-surface2/50'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-text truncate">{project.name}</span>
                        <span className={`badge flex-shrink-0 ${costStatusConfig[project.status as keyof typeof costStatusConfig].class}`}>
                          {costStatusConfig[project.status as keyof typeof costStatusConfig].label}
                        </span>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ml-2 ${project.totalDelayCost > 0 ? 'text-danger' : 'text-success'}`}>
                        {project.totalDelayCost > 0 ? `-${formatCurrency(project.totalDelayCost)}` : '$0'}
                      </span>
                    </div>

                    {/* Daily carrying cost — editable */}
                    <div className="flex items-center justify-between text-xs">
                      {isEditing ? (
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-muted">$/day:</span>
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="input text-xs py-0.5 w-24"
                            placeholder="e.g. 5000"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(project.id);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                          <button
                            disabled={isSaving}
                            onClick={() => saveEdit(project.id)}
                            className="text-success hover:text-success/80 font-medium"
                          >
                            {isSaving ? '…' : 'Save'}
                          </button>
                          <button onClick={cancelEdit} className="text-muted hover:text-text">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group">
                          <span className="text-muted">
                            {project.dailyCarryingCost > 0
                              ? `${formatCurrency(project.dailyCarryingCost)}/day carrying cost`
                              : 'No carrying cost set'}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); startEdit(project); }}
                            className="opacity-0 group-hover:opacity-100 text-muted hover:text-accent transition-opacity"
                            title="Edit daily carrying cost"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <span className="text-muted">
                        {project.overduePermits} permit{project.overduePermits !== 1 ? 's' : ''} overdue
                      </span>
                    </div>

                    {/* Expanded permit list */}
                    {isExpanded && project.permits.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border space-y-2">
                        {project.permits.map((permit) => (
                          <div key={permit.id} className="flex items-center justify-between text-xs">
                            <div>
                              <span className="text-text">{permit.name}</span>
                              <span className="text-muted ml-2">{permit.daysInQueue}d / {permit.avgDays}d avg</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {permit.daysOverdue > 0 ? (
                                <>
                                  <span className="text-danger">{permit.daysOverdue}d overdue</span>
                                  <span className="text-danger font-medium">
                                    -{formatCurrency(permit.daysOverdue * project.dailyCarryingCost)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-success">On track</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Cost Drivers */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="text-sm font-semibold text-text">Top Cost Drivers</h3>
          </div>

          <div className="p-4 space-y-3">
            {permitCostImpacts.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-success/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-success font-medium">No delays!</p>
                <p className="text-xs text-muted mt-1">All permits are on track</p>
              </div>
            ) : (
              permitCostImpacts.slice(0, 5).map((permit, index) => (
                <div
                  key={permit.permitId}
                  className="flex items-center gap-3 p-3 bg-surface2 rounded-lg"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    index === 0 ? 'bg-danger text-white'
                    : index === 1 ? 'bg-warn/30 text-warn'
                    : 'bg-border text-muted'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{permit.permitName}</p>
                    <p className="text-xs text-muted">{permit.projectName}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-danger">
                      -{formatCurrency(permit.totalDelayCost)}
                    </p>
                    <p className="text-xs text-muted">
                      {permit.daysOverdue}d × {formatCurrencyCompact(permit.dailyCarryingCost)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 30-day projection */}
          {permitCostImpacts.length > 0 && (
            <div className="p-4 border-t border-border bg-danger/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted uppercase tracking-wide">30-Day Projection</span>
                <span className="text-lg font-bold text-danger">
                  -{formatCurrencyCompact(portfolioSummary.projectedMonthlyCost)}
                </span>
              </div>
              <p className="text-xs text-muted">
                At {formatCurrencyCompact(portfolioSummary.projectedMonthlyCost / 30)}/day if delays continue
              </p>
            </div>
          )}

          {/* All permits on track */}
          {permitCostImpacts.length > 0 && (
            <div className="p-4 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Permits on track</span>
                <span className="text-success font-medium">
                  {projects.reduce((sum, p) => sum + p.permits.filter((pm) => pm.daysOverdue === 0).length, 0)} permits
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-muted">Total permits tracked</span>
                <span className="text-text">
                  {projects.reduce((sum, p) => sum + p.permits.length, 0)} permits
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
