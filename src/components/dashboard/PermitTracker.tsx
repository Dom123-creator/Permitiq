'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { DocumentPanel } from '@/components/documents';
import { InspectionPanel } from '@/components/inspections';
import { AddPermitModal, EditPermitModal } from '@/components/permits';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';

interface Permit {
  id: string;
  name: string;
  type: string;
  jurisdiction: string;
  permitNumber: string;
  status: 'under-review' | 'info-requested' | 'approved' | 'pending' | 'rejected';
  daysInQueue: number;
  avgDays: number;
  projectName: string;
  documentCount: number;
  inspectionCount: number;
  inspectionsPassed: number;
  expiryDate: Date | null;
  projectId?: string | null;
  authority?: string | null;
  notes?: string | null;
  feeBudgeted?: number | null;
}

// Helper to create dates relative to today
const daysFromNow = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const demoPermits: Permit[] = [
  {
    id: '1',
    name: 'Building Permit - Foundation',
    type: 'Building',
    jurisdiction: 'Houston',
    permitNumber: 'BP-2024-001234',
    status: 'under-review',
    daysInQueue: 12,
    avgDays: 15,
    projectName: 'Downtown Office Tower',
    documentCount: 3,
    inspectionCount: 5,
    inspectionsPassed: 2,
    expiryDate: daysFromNow(45),
  },
  {
    id: '2',
    name: 'Electrical Permit - Main Panel',
    type: 'Electrical',
    jurisdiction: 'Harris County',
    permitNumber: 'EP-2024-005678',
    status: 'info-requested',
    daysInQueue: 28,
    avgDays: 20,
    projectName: 'Memorial Hospital Wing',
    documentCount: 5,
    inspectionCount: 2,
    inspectionsPassed: 0,
    expiryDate: daysFromNow(15),
  },
  {
    id: '3',
    name: 'Plumbing Permit - Water Lines',
    type: 'Plumbing',
    jurisdiction: 'Houston',
    permitNumber: 'PP-2024-003456',
    status: 'approved',
    daysInQueue: 8,
    avgDays: 12,
    projectName: 'Westside Retail Center',
    documentCount: 2,
    inspectionCount: 2,
    inspectionsPassed: 2,
    expiryDate: daysFromNow(120),
  },
  {
    id: '4',
    name: 'HVAC Permit - Ductwork',
    type: 'Mechanical',
    jurisdiction: 'Austin',
    permitNumber: 'MP-2024-007890',
    status: 'pending',
    daysInQueue: 35,
    avgDays: 18,
    projectName: 'University Science Building',
    documentCount: 0,
    inspectionCount: 2,
    inspectionsPassed: 0,
    expiryDate: daysFromNow(7),
  },
  {
    id: '5',
    name: 'Fire Alarm Permit',
    type: 'Fire',
    jurisdiction: 'Houston',
    permitNumber: 'FP-2024-002345',
    status: 'under-review',
    daysInQueue: 5,
    avgDays: 10,
    projectName: 'Airport Terminal Expansion',
    documentCount: 1,
    inspectionCount: 2,
    inspectionsPassed: 1,
    expiryDate: null,
  },
  {
    id: '6',
    name: 'Structural Permit - Steel Frame',
    type: 'Building',
    jurisdiction: 'Houston',
    permitNumber: 'BP-2024-001567',
    status: 'under-review',
    daysInQueue: 22,
    avgDays: 15,
    projectName: 'Downtown Office Tower',
    documentCount: 4,
    inspectionCount: 5,
    inspectionsPassed: 3,
    expiryDate: daysFromNow(25),
  },
  {
    id: '7',
    name: 'Electrical Permit - Sub-panels',
    type: 'Electrical',
    jurisdiction: 'Houston',
    permitNumber: 'EP-2024-005890',
    status: 'pending',
    daysInQueue: 3,
    avgDays: 20,
    projectName: 'Westside Retail Center',
    documentCount: 1,
    inspectionCount: 2,
    inspectionsPassed: 0,
    expiryDate: daysFromNow(90),
  },
];

const statusConfig = {
  'under-review': { label: 'Under Review', class: 'badge-info' },
  'info-requested': { label: 'Info Requested', class: 'badge-warn' },
  approved: { label: 'Approved', class: 'badge-success' },
  pending: { label: 'Pending', class: 'badge-purple' },
  rejected: { label: 'Rejected', class: 'badge-danger' },
};

type SortField = 'name' | 'projectName' | 'jurisdiction' | 'daysInQueue' | 'status' | 'expiryDate';
type SortDirection = 'asc' | 'desc';

interface Filters {
  search: string;
  project: string;
  type: string;
  status: string;
  overdueOnly: boolean;
  expiringWithin: number | null; // days
}

function getDaysChipClass(daysInQueue: number, avgDays: number): string {
  if (daysInQueue > avgDays + 10) return 'days-chip-danger';
  if (daysInQueue > avgDays) return 'days-chip-warn';
  return 'days-chip-ok';
}

function isOverdue(permit: Permit): boolean {
  return permit.daysInQueue > permit.avgDays;
}

function getDaysUntilExpiry(expiryDate: Date | null): number | null {
  if (!expiryDate) return null;
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getExpiryStatus(daysUntil: number | null): { label: string; class: string; tier: 'critical' | 'warning' | 'caution' | 'ok' | 'none' } {
  if (daysUntil === null) {
    return { label: 'No expiry', class: 'text-muted', tier: 'none' };
  }
  if (daysUntil <= 0) {
    return { label: 'Expired', class: 'bg-danger text-white', tier: 'critical' };
  }
  if (daysUntil <= 30) {
    return { label: `${daysUntil}d`, class: 'bg-danger/20 text-danger', tier: 'critical' };
  }
  if (daysUntil <= 60) {
    return { label: `${daysUntil}d`, class: 'bg-warn/20 text-warn', tier: 'warning' };
  }
  if (daysUntil <= 90) {
    return { label: `${daysUntil}d`, class: 'bg-accent/20 text-accent', tier: 'caution' };
  }
  return { label: `${daysUntil}d`, class: 'bg-success/20 text-success', tier: 'ok' };
}

export function PermitTracker() {
  const [apiPermits, setApiPermits] = useState<Permit[] | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [isDocPanelOpen, setIsDocPanelOpen] = useState(false);
  const [isInspectionPanelOpen, setIsInspectionPanelOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPermit, setEditingPermit] = useState<Permit | null>(null);
  const [taskingPermit, setTaskingPermit] = useState<Permit | null>(null);

  // Derived state
  const isLoading = !isDemoMode && apiPermits === null;
  const showEmptyState = !isDemoMode && apiPermits !== null && apiPermits.length === 0;

  // Display list: demo data overrides; fall back to demo during load / on API error
  const permits = useMemo(
    () => (isDemoMode ? demoPermits : (apiPermits ?? demoPermits)),
    [isDemoMode, apiPermits]
  );

  const loadPermits = useCallback(() => {
    fetch('/api/permits')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setApiPermits(
            data.map((p) => ({
              ...p,
              expiryDate: p.expiryDate ? new Date(p.expiryDate) : null,
            }))
          );
        }
      })
      .catch(() => { /* apiPermits stays null → permits falls back to demoPermits */ });
  }, []);

  // Read demo mode preference from localStorage after hydration
  useEffect(() => {
    setIsDemoMode(localStorage.getItem('permitiq_demo_mode') === 'true');
  }, []);

  // Fetch real permits whenever demo mode is off
  useEffect(() => {
    if (!isDemoMode) loadPermits();
  }, [isDemoMode, loadPermits]);

  // Reload when wizard or other actions dispatch permitiq:refresh
  useEffect(() => {
    const handler = () => loadPermits();
    window.addEventListener('permitiq:refresh', handler);
    return () => window.removeEventListener('permitiq:refresh', handler);
  }, [loadPermits]);

  const toggleDemoMode = () => {
    const next = !isDemoMode;
    setIsDemoMode(next);
    localStorage.setItem('permitiq_demo_mode', String(next));
    // Reset apiPermits so loading indicator shows while refetching real data
    if (!next) setApiPermits(null);
  };

  // Search and filter state
  const [filters, setFilters] = useState<Filters>({
    search: '',
    project: '',
    type: '',
    status: '',
    overdueOnly: false,
    expiringWithin: null,
  });

  // Sort state
  const [sortField, setSortField] = useState<SortField>('daysInQueue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Get unique values for filter dropdowns
  const projects = useMemo(() => Array.from(new Set(permits.map((p) => p.projectName))), [permits]);
  const types = useMemo(() => Array.from(new Set(permits.map((p) => p.type))), [permits]);
  const statuses = Object.keys(statusConfig) as Array<keyof typeof statusConfig>;

  // Expiry stats
  const expiryStats = useMemo(() => {
    const stats = { critical: 0, warning: 0, caution: 0 };
    permits.forEach((p) => {
      const days = getDaysUntilExpiry(p.expiryDate);
      if (days !== null) {
        if (days <= 30) stats.critical++;
        else if (days <= 60) stats.warning++;
        else if (days <= 90) stats.caution++;
      }
    });
    return stats;
  }, [permits]);

  // Filter and sort permits
  const filteredPermits = useMemo(() => {
    let result = [...permits];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.permitNumber.toLowerCase().includes(searchLower) ||
          p.jurisdiction.toLowerCase().includes(searchLower) ||
          p.projectName.toLowerCase().includes(searchLower)
      );
    }

    // Apply project filter
    if (filters.project) {
      result = result.filter((p) => p.projectName === filters.project);
    }

    // Apply type filter
    if (filters.type) {
      result = result.filter((p) => p.type === filters.type);
    }

    // Apply status filter
    if (filters.status) {
      result = result.filter((p) => p.status === filters.status);
    }

    // Apply overdue filter
    if (filters.overdueOnly) {
      result = result.filter((p) => isOverdue(p));
    }

    // Apply expiry filter
    if (filters.expiringWithin !== null) {
      result = result.filter((p) => {
        const days = getDaysUntilExpiry(p.expiryDate);
        return days !== null && days <= filters.expiringWithin!;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'projectName':
          comparison = a.projectName.localeCompare(b.projectName);
          break;
        case 'jurisdiction':
          comparison = a.jurisdiction.localeCompare(b.jurisdiction);
          break;
        case 'daysInQueue':
          comparison = a.daysInQueue - b.daysInQueue;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'expiryDate':
          const daysA = getDaysUntilExpiry(a.expiryDate);
          const daysB = getDaysUntilExpiry(b.expiryDate);
          if (daysA === null && daysB === null) comparison = 0;
          else if (daysA === null) comparison = 1;
          else if (daysB === null) comparison = -1;
          else comparison = daysA - daysB;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [permits, filters, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      project: '',
      type: '',
      status: '',
      overdueOnly: false,
      expiringWithin: null,
    });
  };

  const hasActiveFilters = filters.project || filters.type || filters.status || filters.overdueOnly || filters.expiringWithin !== null;

  const openDocuments = (permit: Permit) => {
    setSelectedPermit(permit);
    setIsDocPanelOpen(true);
    setIsInspectionPanelOpen(false);
  };

  const closeDocuments = () => {
    setIsDocPanelOpen(false);
    setSelectedPermit(null);
  };

  const openInspections = (permit: Permit) => {
    setSelectedPermit(permit);
    setIsInspectionPanelOpen(true);
    setIsDocPanelOpen(false);
  };

  const closeInspections = () => {
    setIsInspectionPanelOpen(false);
    setSelectedPermit(null);
  };

  const handleDelete = async (permit: Permit) => {
    if (!window.confirm(`Archive "${permit.name}"? It will be removed from the tracker.`)) return;
    try {
      const res = await fetch(`/api/permits/${permit.id}`, { method: 'DELETE' });
      if (res.ok) {
        setApiPermits((prev) => (prev ? prev.filter((p) => p.id !== permit.id) : prev));
      }
    } catch {
      // silent fail — permit stays in list
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {sortDirection === 'asc' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        )}
      </svg>
    );
  };

  return (
    <>
      {/* Expiry Warning Banner */}
      {(expiryStats.critical > 0 || expiryStats.warning > 0) && (
        <div className="mb-4 p-4 bg-surface border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-warn" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-text">Permit Expiry Alerts</span>
              </div>
              <div className="flex items-center gap-3">
                {expiryStats.critical > 0 && (
                  <button
                    onClick={() => setFilters({ ...filters, expiringWithin: 30 })}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-danger/20 hover:bg-danger/30 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                    <span className="text-xs font-medium text-danger">{expiryStats.critical} critical (&lt;30d)</span>
                  </button>
                )}
                {expiryStats.warning > 0 && (
                  <button
                    onClick={() => setFilters({ ...filters, expiringWithin: 60 })}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-warn/20 hover:bg-warn/30 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-warn" />
                    <span className="text-xs font-medium text-warn">{expiryStats.warning} warning (30-60d)</span>
                  </button>
                )}
                {expiryStats.caution > 0 && (
                  <button
                    onClick={() => setFilters({ ...filters, expiringWithin: 90 })}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent/20 hover:bg-accent/30 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-xs font-medium text-accent">{expiryStats.caution} caution (60-90d)</span>
                  </button>
                )}
              </div>
            </div>
            <button className="text-xs text-muted hover:text-text">View all expiring</button>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="text-lg font-semibold text-text">Permit Tracker</h2>
            <p className="text-sm text-muted">
              {filteredPermits.length} of {permits.length} permits
              {hasActiveFilters && ' (filtered)'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* New Permit button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-primary btn-sm"
            >
              + New Permit
            </button>

            {/* Search Input */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search permits..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input pl-10 w-64"
              />
              {filters.search && (
                <button
                  onClick={() => setFilters({ ...filters, search: '' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Demo mode toggle */}
            <button
              onClick={toggleDemoMode}
              title={isDemoMode ? 'Showing demo data — click to show real data' : 'Show sample demo data'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isDemoMode
                  ? 'bg-accent/10 text-accent border-accent/30 hover:bg-accent/20'
                  : 'text-muted border-border hover:text-text hover:border-muted'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isDemoMode ? 'bg-accent' : 'bg-muted'}`} />
              Demo
            </button>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn btn-sm ${showFilters || hasActiveFilters ? 'btn-primary' : 'btn-secondary'}`}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
              {hasActiveFilters && (
                <span className="ml-1 w-5 h-5 rounded-full bg-bg text-accent text-xs flex items-center justify-center">
                  {[filters.project, filters.type, filters.status, filters.overdueOnly, filters.expiringWithin].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="px-4 py-3 border-b border-border bg-surface2/50">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Project Filter */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted">Project:</label>
                <select
                  value={filters.project}
                  onChange={(e) => setFilters({ ...filters, project: e.target.value })}
                  className="select text-sm py-1.5 w-48"
                >
                  <option value="">All Projects</option>
                  {projects.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted">Type:</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="select text-sm py-1.5 w-36"
                >
                  <option value="">All Types</option>
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted">Status:</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="select text-sm py-1.5 w-40"
                >
                  <option value="">All Statuses</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {statusConfig[status].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expiry Filter */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted">Expiring:</label>
                <select
                  value={filters.expiringWithin ?? ''}
                  onChange={(e) => setFilters({ ...filters, expiringWithin: e.target.value ? Number(e.target.value) : null })}
                  className="select text-sm py-1.5 w-36"
                >
                  <option value="">Any time</option>
                  <option value="30">Within 30 days</option>
                  <option value="60">Within 60 days</option>
                  <option value="90">Within 90 days</option>
                </select>
              </div>

              {/* Overdue Toggle */}
              <button
                onClick={() => setFilters({ ...filters, overdueOnly: !filters.overdueOnly })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  filters.overdueOnly
                    ? 'bg-danger/20 border-danger text-danger'
                    : 'bg-surface2 border-border text-muted hover:text-text'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Overdue Only
              </button>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-muted hover:text-text ml-auto"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        {hasActiveFilters && !showFilters && (
          <div className="px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted">Active filters:</span>
            {filters.project && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface2 text-xs text-text">
                {filters.project}
                <button
                  onClick={() => setFilters({ ...filters, project: '' })}
                  className="text-muted hover:text-danger"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {filters.type && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface2 text-xs text-text">
                {filters.type}
                <button
                  onClick={() => setFilters({ ...filters, type: '' })}
                  className="text-muted hover:text-danger"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface2 text-xs text-text">
                {statusConfig[filters.status as keyof typeof statusConfig].label}
                <button
                  onClick={() => setFilters({ ...filters, status: '' })}
                  className="text-muted hover:text-danger"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {filters.expiringWithin !== null && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-warn/20 text-xs text-warn">
                Expiring within {filters.expiringWithin}d
                <button
                  onClick={() => setFilters({ ...filters, expiringWithin: null })}
                  className="text-warn hover:text-warn"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {filters.overdueOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-danger/20 text-xs text-danger">
                Overdue Only
                <button
                  onClick={() => setFilters({ ...filters, overdueOnly: false })}
                  className="text-danger hover:text-danger"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-xs text-accent hover:underline ml-2"
            >
              Clear all
            </button>
          </div>
        )}

        {isLoading && (
          <div className="px-4 py-8 text-center text-sm text-muted animate-pulse">Loading permits...</div>
        )}

        {/* Empty state — shown when DB is connected but no permits exist yet */}
        {showEmptyState && (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface2 border border-border flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-text mb-2">No permits yet</h3>
            <p className="text-sm text-muted mb-6 max-w-xs">
              Add your first permit to start tracking. PermitIQ will monitor status, flag deadlines, and auto-create tasks.
            </p>
            <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
              Add your first permit
            </button>
            <button
              onClick={toggleDemoMode}
              className="mt-3 text-xs text-muted hover:text-accent transition-colors"
            >
              Or explore with demo data →
            </button>
          </div>
        )}

        {!showEmptyState && <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th
                  onClick={() => handleSort('name')}
                  className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide cursor-pointer hover:text-text group"
                >
                  <div className="flex items-center gap-1">
                    Permit
                    <SortIcon field="name" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('projectName')}
                  className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide cursor-pointer hover:text-text group"
                >
                  <div className="flex items-center gap-1">
                    Project
                    <SortIcon field="projectName" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('jurisdiction')}
                  className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide cursor-pointer hover:text-text group"
                >
                  <div className="flex items-center gap-1">
                    Jurisdiction
                    <SortIcon field="jurisdiction" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('daysInQueue')}
                  className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide cursor-pointer hover:text-text group"
                >
                  <div className="flex items-center gap-1">
                    Days
                    <SortIcon field="daysInQueue" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('expiryDate')}
                  className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide cursor-pointer hover:text-text group"
                >
                  <div className="flex items-center gap-1">
                    Expiry
                    <SortIcon field="expiryDate" />
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
                  Docs
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
                  Inspections
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide cursor-pointer hover:text-text group"
                >
                  <div className="flex items-center gap-1">
                    Status
                    <SortIcon field="status" />
                  </div>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPermits.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="text-muted">
                      <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm">No permits match your filters</p>
                      <button
                        onClick={clearFilters}
                        className="text-accent text-sm mt-2 hover:underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPermits.map((permit) => {
                  const daysUntilExpiry = getDaysUntilExpiry(permit.expiryDate);
                  const expiryStatus = getExpiryStatus(daysUntilExpiry);

                  return (
                    <tr key={permit.id} className="border-b border-border hover:bg-surface2 transition-colors group">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-text">{permit.name}</div>
                          <div className="text-xs text-muted">{permit.permitNumber}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-text">{permit.projectName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-text">{permit.jurisdiction}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`days-chip ${getDaysChipClass(permit.daysInQueue, permit.avgDays)}`}>
                          {permit.daysInQueue}d / {permit.avgDays}d avg
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${expiryStatus.class}`}>
                          {expiryStatus.tier === 'critical' && daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          )}
                          {expiryStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDocuments(permit)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface2 hover:bg-border transition-colors group"
                        >
                          <svg
                            className="w-4 h-4 text-muted group-hover:text-accent"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <span className={`text-xs font-medium ${permit.documentCount > 0 ? 'text-text' : 'text-muted'}`}>
                            {permit.documentCount}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openInspections(permit)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface2 hover:bg-border transition-colors group"
                        >
                          <svg
                            className="w-4 h-4 text-muted group-hover:text-accent"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                            />
                          </svg>
                          <span className={`text-xs font-medium ${permit.inspectionsPassed > 0 ? 'text-success' : 'text-muted'}`}>
                            {permit.inspectionsPassed}/{permit.inspectionCount}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${statusConfig[permit.status].class}`}>
                          {statusConfig[permit.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="btn btn-ghost btn-sm">Ask Agent</button>
                          <button
                            onClick={() => setTaskingPermit(permit)}
                            className="btn btn-secondary btn-sm"
                          >
                            + Task
                          </button>
                          {/* Edit button — visible on row hover */}
                          <button
                            onClick={() => setEditingPermit(permit)}
                            className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-surface2 opacity-0 group-hover:opacity-100 transition-all"
                            title="Edit permit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {/* Delete/archive button — visible on row hover */}
                          <button
                            onClick={() => handleDelete(permit)}
                            className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-all"
                            title="Archive permit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>}

        {/* Results Summary */}
        {filteredPermits.length > 0 && (
          <div className="px-4 py-3 border-t border-border text-xs text-muted">
            Showing {filteredPermits.length} of {permits.length} permits
            {sortField && (
              <span className="ml-2">
                • Sorted by {sortField === 'daysInQueue' ? 'days in queue' : sortField === 'expiryDate' ? 'expiry date' : sortField} ({sortDirection === 'asc' ? 'ascending' : 'descending'})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Document Panel */}
      {selectedPermit && (
        <DocumentPanel
          permitId={selectedPermit.id}
          permitName={selectedPermit.name}
          isOpen={isDocPanelOpen}
          onClose={closeDocuments}
        />
      )}

      {/* Inspection Panel */}
      {selectedPermit && (
        <InspectionPanel
          permitId={selectedPermit.id}
          permitName={selectedPermit.name}
          permitType={selectedPermit.type}
          isOpen={isInspectionPanelOpen}
          onClose={closeInspections}
        />
      )}

      {/* Create Task Modal — opened from permit row "+ Task" button */}
      {taskingPermit && (
        <CreateTaskModal
          defaultPermitId={taskingPermit.id}
          defaultProjectId={taskingPermit.projectId ?? ''}
          onClose={() => setTaskingPermit(null)}
          onSuccess={() => setTaskingPermit(null)}
        />
      )}

      {/* Add Permit Modal */}
      {isAddModalOpen && (
        <AddPermitModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => { setIsAddModalOpen(false); loadPermits(); }}
        />
      )}

      {/* Edit Permit Modal */}
      {editingPermit && (
        <EditPermitModal
          permit={editingPermit}
          onClose={() => setEditingPermit(null)}
          onSuccess={() => { setEditingPermit(null); loadPermits(); }}
        />
      )}
    </>
  );
}
