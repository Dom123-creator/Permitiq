'use client';

import { useState, useEffect, useCallback } from 'react';

interface Rule {
  id: string;
  name: string;
  description: string | null;
  triggerCondition: string;
  actionTemplate: string;
  enabled: boolean;
  tasksCreated: number | null;
  createdAt: string;
}

interface AutoTask {
  id: string;
  title: string;
  priority: string;
  createdAt: string;
  projectName: string | null;
  permitName: string | null;
  ruleName: string | null;
}

interface RunResult {
  tasksCreated: number;
  rulesEvaluated: number;
  permitsScanned: number;
  fired: { ruleName: string; permitName: string; projectName: string; taskTitle: string; priority: string }[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const priorityColors: Record<string, string> = {
  urgent: 'text-danger',
  high: 'text-warn',
  medium: 'text-accent',
  low: 'text-muted',
};

export function RuleEngine() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [recentTasks, setRecentTasks] = useState<AutoTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<RunResult | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [rulesRes, tasksRes] = await Promise.all([
        fetch('/api/rules'),
        fetch('/api/tasks?type=auto'),
      ]);
      const [rulesData, tasksData] = await Promise.all([rulesRes.json(), tasksRes.json()]);
      if (Array.isArray(rulesData)) setRules(rulesData);
      if (Array.isArray(tasksData)) setRecentTasks(tasksData.slice(0, 8));
    } catch {
      // keep current state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleRule = async (rule: Rule) => {
    const newEnabled = !rule.enabled;
    setTogglingId(rule.id);

    // Optimistic update
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, enabled: newEnabled } : r));

    try {
      const res = await fetch(`/api/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled }),
      });
      if (!res.ok) throw new Error('Failed');
    } catch {
      // Revert
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, enabled: rule.enabled } : r));
    } finally {
      setTogglingId(null);
    }
  };

  const runAgent = async () => {
    setIsRunning(true);
    setLastRunResult(null);
    try {
      const res = await fetch('/api/rules/run', { method: 'POST' });
      const result: RunResult = await res.json();
      setLastRunResult(result);
      // Reload rules (tasksCreated updated) and recent tasks
      await loadData();
    } catch {
      setLastRunResult({ tasksCreated: 0, rulesEvaluated: 0, permitsScanned: 0, fired: [] });
    } finally {
      setIsRunning(false);
    }
  };

  const totalTasksCreated = rules.reduce((sum, r) => sum + (r.tasksCreated ?? 0), 0);
  const activeRules = rules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card border-t-2 border-t-accent">
          {isLoading ? (
            <div className="h-8 w-8 rounded bg-surface2 animate-pulse mb-1" />
          ) : (
            <div className="text-2xl font-bold text-text">{rules.length}</div>
          )}
          <div className="text-xs text-muted">Total Rules</div>
        </div>
        <div className="stat-card border-t-2 border-t-success">
          {isLoading ? (
            <div className="h-8 w-8 rounded bg-surface2 animate-pulse mb-1" />
          ) : (
            <div className="text-2xl font-bold text-text">{activeRules}</div>
          )}
          <div className="text-xs text-muted">Active Rules</div>
        </div>
        <div className="stat-card border-t-2 border-t-purple">
          {isLoading ? (
            <div className="h-8 w-8 rounded bg-surface2 animate-pulse mb-1" />
          ) : (
            <div className="text-2xl font-bold text-text">{totalTasksCreated}</div>
          )}
          <div className="text-xs text-muted">Tasks Auto-Created</div>
        </div>
        <div className="stat-card border-t-2 border-t-warn">
          <div className="text-2xl font-bold text-text">Tue/Fri</div>
          <div className="text-xs text-muted">Scan Schedule</div>
        </div>
      </div>

      {/* Last run result banner */}
      {lastRunResult && (
        <div className={`p-4 rounded-lg border ${
          lastRunResult.tasksCreated > 0
            ? 'bg-success/10 border-success/30'
            : 'bg-surface border-border'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-success text-lg">✓</span>
              <div>
                <span className="text-sm font-medium text-text">
                  Agent scan complete — {lastRunResult.permitsScanned} permits evaluated, {lastRunResult.rulesEvaluated} rules checked
                </span>
                {lastRunResult.tasksCreated > 0 ? (
                  <p className="text-xs text-success mt-0.5">
                    {lastRunResult.tasksCreated} new task{lastRunResult.tasksCreated !== 1 ? 's' : ''} created
                  </p>
                ) : (
                  <p className="text-xs text-muted mt-0.5">No new tasks — all rules already accounted for this week</p>
                )}
              </div>
            </div>
            <button onClick={() => setLastRunResult(null)} className="text-muted hover:text-text text-sm">✕</button>
          </div>
          {lastRunResult.fired.length > 0 && (
            <div className="mt-3 space-y-1">
              {lastRunResult.fired.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-purple">⚡</span>
                  <span className={`font-medium ${priorityColors[f.priority]}`}>[{f.priority}]</span>
                  <span className="text-muted">{f.ruleName}</span>
                  <span className="text-text">→</span>
                  <span className="text-text">{f.taskTitle}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rules Panel */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="text-lg font-semibold text-text">Rule Engine</h2>
            <p className="text-sm text-muted">Configure automatic task creation rules</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runAgent}
              disabled={isRunning}
              className="btn btn-primary"
            >
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Scanning...
                </span>
              ) : (
                '▶ Run Agent'
              )}
            </button>
            <button className="btn btn-secondary">+ Add Rule</button>
          </div>
        </div>

        {isLoading && (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4">
                <div className="h-4 w-48 bg-surface2 rounded animate-pulse mb-2" />
                <div className="h-3 w-full bg-surface2 rounded animate-pulse mb-3 opacity-50" />
                <div className="h-3 w-64 bg-surface2 rounded animate-pulse opacity-30" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && (
          <div className="divide-y divide-border">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`p-4 transition-colors ${rule.enabled ? '' : 'opacity-50'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-semibold text-text">{rule.name}</h3>
                      {rule.enabled ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <span className="badge bg-muted/20 text-muted">Disabled</span>
                      )}
                    </div>
                    <p className="text-sm text-muted mb-3">{rule.description}</p>

                    <div className="flex items-start gap-6 text-xs flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="text-muted">Trigger:</span>
                        <code className="px-1.5 py-0.5 bg-surface2 rounded text-accent">
                          {rule.triggerCondition}
                        </code>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted">Action:</span>
                        <span className="text-purple">{rule.actionTemplate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-lg font-bold text-text">{rule.tasksCreated ?? 0}</div>
                      <div className="text-xs text-muted">tasks created</div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      onClick={() => toggleRule(rule)}
                      disabled={togglingId === rule.id}
                      title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        rule.enabled ? 'bg-accent' : 'bg-border'
                      } ${togglingId === rule.id ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          rule.enabled ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Auto-Tasks */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="text-sm font-semibold text-text">Recent Auto-Tasks</h3>
          <span className="text-xs text-muted">{recentTasks.length} auto-generated</span>
        </div>

        {isLoading && (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-5 bg-surface2 rounded animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && recentTasks.length === 0 && (
          <div className="p-6 text-center text-sm text-muted">
            No auto-generated tasks yet — click ▶ Run Agent to evaluate rules
          </div>
        )}

        {!isLoading && recentTasks.length > 0 && (
          <div className="divide-y divide-border">
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="text-purple flex-shrink-0">⚡</span>
                <span className={`flex-shrink-0 text-xs font-medium ${priorityColors[task.priority] ?? 'text-muted'}`}>
                  [{task.priority}]
                </span>
                {task.ruleName && (
                  <span className="text-muted flex-shrink-0 text-xs">{task.ruleName}</span>
                )}
                <span className="text-text flex-1 truncate">{task.title}</span>
                {task.projectName && (
                  <span className="text-muted text-xs flex-shrink-0 truncate max-w-[120px]">{task.projectName}</span>
                )}
                <span className="text-xs text-muted flex-shrink-0">{timeAgo(task.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
