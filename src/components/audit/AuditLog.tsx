'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  AuditLogEntry,
  actorTypeConfig,
  getActionLabel,
  getActionIcon,
  formatAuditTimestamp,
} from './AuditTypes';

interface AuditLogProps {
  permitId?: string;
  limit?: number;
  showFilters?: boolean;
}

export function AuditLog({ permitId, limit, showFilters = true }: AuditLogProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [actorTypeFilter, setActorTypeFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (permitId) params.set('permitId', permitId);
    params.set('limit', String(limit ?? 100));

    fetch(`/api/audit?${params}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setEntries(data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [permitId, limit]);

  const uniqueActions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.action))).sort(),
    [entries]
  );

  const filtered = useMemo(() => {
    let result = [...entries];

    if (actorTypeFilter !== 'all') {
      result = result.filter((e) => e.actorType === actorTypeFilter);
    }
    if (actionFilter !== 'all') {
      result = result.filter((e) => e.action === actionFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          (e.permitName ?? '').toLowerCase().includes(q) ||
          (e.projectName ?? '').toLowerCase().includes(q) ||
          e.actorName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [entries, actorTypeFilter, actionFilter, search]);

  const hasFilters = actorTypeFilter !== 'all' || actionFilter !== 'all' || search.trim() !== '';

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-surface2 flex-shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 bg-surface2 rounded w-3/4" />
              <div className="h-3 bg-surface2 rounded w-1/2 opacity-60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search descriptions, permits, actors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-full text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Actor filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted">Actor:</label>
            <select
              value={actorTypeFilter}
              onChange={(e) => setActorTypeFilter(e.target.value)}
              className="select text-sm py-1.5 w-28"
            >
              <option value="all">All</option>
              <option value="user">User</option>
              <option value="agent">Agent</option>
            </select>
          </div>

          {/* Action filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted">Action:</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="select text-sm py-1.5 w-44"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {getActionLabel(action)}
                </option>
              ))}
            </select>
          </div>

          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setActorTypeFilter('all'); setActionFilter('all'); }}
              className="text-xs text-accent hover:underline"
            >
              Clear filters
            </button>
          )}

          <span className="text-xs text-muted ml-auto">
            {filtered.length} of {entries.length} entries
          </span>
        </div>
      )}

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-muted">
            {entries.length === 0 ? 'No audit entries yet' : 'No entries match your filters'}
          </p>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setActorTypeFilter('all'); setActionFilter('all'); }}
              className="text-xs text-accent hover:underline mt-1"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-3">
            {filtered.map((entry) => {
              const actorCfg = actorTypeConfig[entry.actorType] ?? actorTypeConfig['system'];

              return (
                <div key={entry.id} className="relative pl-10">
                  {/* Timeline Node */}
                  <div className="absolute left-2 w-5 h-5 rounded-full bg-surface border-2 border-border flex items-center justify-center text-xs leading-none">
                    {getActionIcon(entry.action)}
                  </div>

                  {/* Entry Card */}
                  <div className="bg-surface2 border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <p className="text-sm text-text leading-snug">{entry.description}</p>
                      <span className="text-xs text-muted whitespace-nowrap flex-shrink-0">
                        {formatAuditTimestamp(entry.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded font-medium ${actorCfg.class}`}>
                        {entry.actorName}
                      </span>
                      <span className="text-muted">•</span>
                      <span className="text-muted">{getActionLabel(entry.action)}</span>
                      {/* Show permit name when not in permit-specific view */}
                      {!permitId && entry.permitName && (
                        <>
                          <span className="text-muted">•</span>
                          <span className="text-text/70">{entry.permitName}</span>
                          {entry.projectName && (
                            <span className="text-muted">{entry.projectName}</span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Value diff */}
                    {(entry.oldValue || entry.newValue) && (
                      <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 text-xs">
                        {entry.oldValue && (
                          <span className="px-2 py-0.5 rounded bg-danger/10 text-danger line-through">
                            {entry.oldValue}
                          </span>
                        )}
                        {entry.oldValue && entry.newValue && (
                          <span className="text-muted">→</span>
                        )}
                        {entry.newValue && (
                          <span className="px-2 py-0.5 rounded bg-success/10 text-success">
                            {entry.newValue}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
