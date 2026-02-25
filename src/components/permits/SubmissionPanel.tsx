'use client';

import { useState, useEffect, useCallback } from 'react';

type SubmissionStatus = 'draft' | 'submitted' | 'under-review' | 'corrections-required' | 'approved';

interface ChecklistItem {
  id: string;
  permitId: string;
  label: string;
  category: string;
  required: boolean;
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
  sortOrder: number;
}

interface SubmissionPanelProps {
  permitId: string;
  permitName: string;
  permitType: string;
  submissionStatus: SubmissionStatus;
  submissionDeadline: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (status: SubmissionStatus) => void;
}

const STAGES: { value: SubmissionStatus; label: string; short: string }[] = [
  { value: 'draft', label: 'Draft', short: 'Draft' },
  { value: 'submitted', label: 'Submitted', short: 'Submitted' },
  { value: 'under-review', label: 'Under Review', short: 'Review' },
  { value: 'corrections-required', label: 'Corrections Required', short: 'Corrections' },
  { value: 'approved', label: 'Approved', short: 'Approved' },
];

const STAGE_ORDER: SubmissionStatus[] = ['draft', 'submitted', 'under-review', 'corrections-required', 'approved'];

function stageIndex(s: SubmissionStatus) {
  return STAGE_ORDER.indexOf(s);
}

const CATEGORY_LABELS: Record<string, string> = {
  documents: 'Documents',
  fees: 'Fees',
  steps: 'Steps',
};
const CATEGORY_ORDER = ['documents', 'fees', 'steps'];

export function SubmissionPanel({
  permitId,
  permitName,
  permitType,
  submissionStatus: initialStatus,
  submissionDeadline: initialDeadline,
  isOpen,
  onClose,
  onStatusChange,
}: SubmissionPanelProps) {
  const [status, setStatus] = useState<SubmissionStatus>(initialStatus);
  const [deadline, setDeadline] = useState(
    initialDeadline ? new Date(initialDeadline).toISOString().split('T')[0] : ''
  );
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Sync props → local state when panel opens for a new permit
  useEffect(() => {
    setStatus(initialStatus);
    setDeadline(initialDeadline ? new Date(initialDeadline).toISOString().split('T')[0] : '');
  }, [permitId, initialStatus, initialDeadline]);

  const loadItems = useCallback(async () => {
    if (!isOpen) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/permits/${permitId}/checklist`);
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } finally {
      setIsLoading(false);
    }
  }, [permitId, isOpen]);

  useEffect(() => {
    if (isOpen) loadItems();
  }, [isOpen, loadItems]);

  const saveStatus = async (newStatus: SubmissionStatus) => {
    setSavingStatus(true);
    try {
      const body: Record<string, unknown> = { submissionStatus: newStatus };
      if (deadline) body.submissionDeadline = deadline;
      if (correctionNotes) body.correctionNotes = correctionNotes;
      const res = await fetch(`/api/permits/${permitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setStatus(newStatus);
        onStatusChange(newStatus);
      }
    } finally {
      setSavingStatus(false);
    }
  };

  const saveDeadline = async (value: string) => {
    setDeadline(value);
    await fetch(`/api/permits/${permitId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionDeadline: value || null }),
    });
  };

  const saveCorrectionNotes = async (value: string) => {
    setCorrectionNotes(value);
    await fetch(`/api/permits/${permitId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correctionNotes: value }),
    });
  };

  const seedDefaults = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch(`/api/permits/${permitId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedDefaults: true }),
      });
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } finally {
      setIsSeeding(false);
    }
  };

  const toggleItem = async (item: ChecklistItem) => {
    setTogglingId(item.id);
    try {
      const res = await fetch(`/api/permits/${permitId}/checklist/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !item.completed }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      }
    } finally {
      setTogglingId(null);
    }
  };

  const deleteItem = async (itemId: string) => {
    const res = await fetch(`/api/permits/${permitId}/checklist/${itemId}`, { method: 'DELETE' });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const addItem = async (category: string) => {
    if (!newItemLabel.trim()) return;
    const res = await fetch(`/api/permits/${permitId}/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newItemLabel.trim(), category, required: false }),
    });
    if (res.ok) {
      const item = await res.json();
      setItems((prev) => [...prev, item]);
    }
    setNewItemLabel('');
    setAddingCategory(null);
  };

  // Derived counts
  const totalRequired = items.filter((i) => i.required).length;
  const completedRequired = items.filter((i) => i.required && i.completed).length;
  const pct = totalRequired === 0 ? 0 : Math.round((completedRequired / totalRequired) * 100);

  const byCategory = CATEGORY_ORDER.reduce<Record<string, ChecklistItem[]>>((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {});

  const daysUntilDeadline = deadline
    ? Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Slide-out panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-surface border-l border-border z-50 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <h2 className="text-base font-semibold text-text">Submission Workflow</h2>
            </div>
            <p className="text-xs text-muted mt-0.5 truncate">{permitName}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text p-1 flex-shrink-0 ml-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Stage progress */}
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Submission Stage</div>
            <div className="flex items-center gap-1">
              {STAGES.map((stage, i) => {
                const currentIdx = stageIndex(status);
                const isActive = stage.value === status;
                const isPast = i < currentIdx;
                const isFuture = i > currentIdx;
                return (
                  <button
                    key={stage.value}
                    onClick={() => saveStatus(stage.value)}
                    disabled={savingStatus}
                    title={stage.label}
                    className={`flex-1 py-2 px-1 rounded text-xs font-medium transition-all text-center truncate ${
                      isActive
                        ? stage.value === 'corrections-required'
                          ? 'bg-warn/20 text-warn border border-warn/40'
                          : stage.value === 'approved'
                          ? 'bg-success/20 text-success border border-success/40'
                          : 'bg-accent/20 text-accent border border-accent/40'
                        : isPast
                        ? 'bg-success/10 text-success/70 border border-success/20'
                        : isFuture
                        ? 'bg-surface2 text-muted border border-border hover:border-muted hover:text-text'
                        : 'bg-surface2 text-muted border border-border'
                    }`}
                  >
                    {stage.short}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted mt-2">
              Currently: <span className="text-text font-medium">{STAGES.find((s) => s.value === status)?.label}</span>
              {savingStatus && <span className="ml-2 text-accent">Saving…</span>}
            </p>
          </div>

          {/* Response deadline */}
          {(status === 'submitted' || status === 'under-review' || status === 'corrections-required') && (
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                AHJ Response Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => saveDeadline(e.target.value)}
                className="input w-full"
              />
              {daysUntilDeadline !== null && (
                <p className={`text-xs mt-1 ${
                  daysUntilDeadline < 0 ? 'text-danger' :
                  daysUntilDeadline <= 7 ? 'text-warn' :
                  'text-muted'
                }`}>
                  {daysUntilDeadline < 0
                    ? `${Math.abs(daysUntilDeadline)} days overdue`
                    : daysUntilDeadline === 0
                    ? 'Due today'
                    : `${daysUntilDeadline} days remaining`}
                </p>
              )}
            </div>
          )}

          {/* Correction notes */}
          {status === 'corrections-required' && (
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                AHJ Correction Notes
              </label>
              <textarea
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                onBlur={(e) => saveCorrectionNotes(e.target.value)}
                rows={3}
                placeholder="Record what the AHJ is requiring before approval…"
                className="input w-full text-sm"
              />
            </div>
          )}

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-muted uppercase tracking-wide">
                Submission Checklist
              </div>
              <div className="flex items-center gap-2">
                {totalRequired > 0 && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    pct === 100 ? 'bg-success/20 text-success' :
                    pct >= 50 ? 'bg-warn/20 text-warn' :
                    'bg-surface2 text-muted'
                  }`}>
                    {completedRequired}/{totalRequired} required
                  </span>
                )}
                {items.length === 0 && !isLoading && (
                  <button
                    onClick={seedDefaults}
                    disabled={isSeeding}
                    className="text-xs px-2.5 py-1 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                  >
                    {isSeeding ? 'Loading…' : `Load ${permitType} defaults`}
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {totalRequired > 0 && (
              <div className="mb-4">
                <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct === 100 ? 'bg-success' : pct >= 50 ? 'bg-accent' : 'bg-warn'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-muted mt-1">{pct}% of required items complete</p>
              </div>
            )}

            {isLoading ? (
              <div className="text-xs text-muted py-4 text-center">Loading checklist…</div>
            ) : items.length === 0 ? (
              <div className="py-6 text-center">
                <svg className="w-10 h-10 mx-auto text-muted/40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-xs text-muted">No checklist items yet.</p>
                <p className="text-xs text-muted mt-0.5">Load defaults or add items manually below.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {CATEGORY_ORDER.map((cat) => {
                  const catItems = byCategory[cat];
                  return (
                    <div key={cat}>
                      <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                        {CATEGORY_LABELS[cat]}
                      </div>
                      <div className="space-y-1">
                        {catItems.length === 0 && (
                          <p className="text-xs text-muted italic">No {CATEGORY_LABELS[cat].toLowerCase()} items</p>
                        )}
                        {catItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface2 group transition-colors"
                          >
                            <button
                              onClick={() => toggleItem(item)}
                              disabled={togglingId === item.id}
                              className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border transition-colors ${
                                item.completed
                                  ? 'bg-success border-success'
                                  : 'border-border hover:border-accent'
                              }`}
                            >
                              {item.completed && (
                                <svg className="w-full h-full text-bg p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm ${item.completed ? 'line-through text-muted' : 'text-text'}`}>
                                {item.label}
                              </span>
                              {item.required && !item.completed && (
                                <span className="ml-1.5 text-xs text-danger/70">*</span>
                              )}
                              {item.completed && item.completedBy && (
                                <p className="text-xs text-muted mt-0.5">by {item.completedBy}</p>
                              )}
                            </div>
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all flex-shrink-0"
                              title="Remove item"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add item inline */}
                      {addingCategory === cat ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            autoFocus
                            type="text"
                            value={newItemLabel}
                            onChange={(e) => setNewItemLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') addItem(cat);
                              if (e.key === 'Escape') { setAddingCategory(null); setNewItemLabel(''); }
                            }}
                            placeholder={`Add ${CATEGORY_LABELS[cat].toLowerCase()} item…`}
                            className="input flex-1 text-sm py-1.5"
                          />
                          <button onClick={() => addItem(cat)} className="btn btn-primary btn-sm py-1.5">Add</button>
                          <button onClick={() => { setAddingCategory(null); setNewItemLabel(''); }} className="btn btn-ghost btn-sm py-1.5">Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingCategory(cat); setNewItemLabel(''); }}
                          className="mt-1.5 text-xs text-muted hover:text-accent transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add {CATEGORY_LABELS[cat].toLowerCase()} item
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Load defaults when there ARE items already */}
            {items.length > 0 && (
              <button
                onClick={seedDefaults}
                disabled={isSeeding}
                className="mt-4 w-full py-2 text-xs text-muted hover:text-text border border-border hover:border-muted rounded-lg transition-colors"
              >
                {isSeeding ? 'Loading…' : 'Reset to defaults'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
