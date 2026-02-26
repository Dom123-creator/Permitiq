'use client';

import { useState, useEffect, useCallback } from 'react';

type FeeType = 'base' | 're-inspection' | 'expedite' | 'plan-check';

interface Fee {
  id: string;
  permitId: string;
  type: FeeType;
  amount: string;
  paidAt: string | null;
  receiptUrl: string | null;
  createdAt: string;
}

const feeTypeLabels: Record<FeeType, string> = {
  base: 'Base Fee',
  're-inspection': 'Re-inspection',
  expedite: 'Expedite Surcharge',
  'plan-check': 'Plan Check Fee',
};

const feeTypeColors: Record<FeeType, string> = {
  base: 'bg-accent/20 text-accent',
  're-inspection': 'bg-danger/20 text-danger',
  expedite: 'bg-warn/20 text-warn',
  'plan-check': 'bg-purple/20 text-purple',
};

interface FeePanelProps {
  permitId: string;
  permitName: string;
  feeBudgeted?: number | null;
  isOpen: boolean;
  onClose: () => void;
}

const emptyForm = { type: 'base' as FeeType, amount: '', paidAt: '', receiptUrl: '' };

export function FeePanel({ permitId, permitName, feeBudgeted, isOpen, onClose }: FeePanelProps) {
  const [fees, setFees] = useState<Fee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  const loadFees = useCallback(async () => {
    if (!isOpen) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/fees?permitId=${permitId}`);
      const data = await res.json();
      if (Array.isArray(data)) setFees(data);
    } finally {
      setIsLoading(false);
    }
  }, [permitId, isOpen]);

  useEffect(() => { loadFees(); }, [loadFees]);

  if (!isOpen) return null;

  const totalCharged = fees.reduce((sum, f) => sum + Number(f.amount), 0);
  const totalPaid = fees.filter((f) => f.paidAt).reduce((sum, f) => sum + Number(f.amount), 0);
  const totalUnpaid = totalCharged - totalPaid;

  const handleAdd = async () => {
    if (!form.amount || !form.type) return;
    setSaving(true);
    try {
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permitId,
          type: form.type,
          amount: Number(form.amount),
          paidAt: form.paidAt || null,
          receiptUrl: form.receiptUrl || null,
        }),
      });
      if (res.ok) {
        setForm(emptyForm);
        setIsAdding(false);
        loadFees();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (fee: Fee) => {
    setMarkingPaid(fee.id);
    try {
      const res = await fetch(`/api/fees/${fee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidAt: new Date().toISOString() }),
      });
      if (res.ok) loadFees();
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleDelete = async (feeId: string) => {
    if (!window.confirm('Delete this fee entry?')) return;
    const res = await fetch(`/api/fees/${feeId}`, { method: 'DELETE' });
    if (res.ok) setFees((prev) => prev.filter((f) => f.id !== feeId));
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-surface border-l border-border z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-text">Fee Log</h2>
            <p className="text-sm text-muted truncate">{permitName}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Budget vs Actual */}
          {feeBudgeted != null && (
            <div className="p-3 bg-surface2 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted">Budgeted</span>
                <span className="text-sm font-medium text-text">{formatCurrency(feeBudgeted)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Charged to date</span>
                <span className={`text-sm font-medium ${totalCharged > feeBudgeted ? 'text-danger' : 'text-success'}`}>
                  {formatCurrency(totalCharged)}
                </span>
              </div>
              {totalCharged > feeBudgeted && (
                <div className="mt-2 text-xs text-danger">
                  {formatCurrency(totalCharged - feeBudgeted)} over budget
                </div>
              )}
            </div>
          )}

          {/* Add Fee Button */}
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-border rounded-lg text-sm text-muted hover:text-text hover:border-accent transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Fee Entry
            </button>
          )}

          {/* Add Fee Form */}
          {isAdding && (
            <div className="p-4 bg-surface2 rounded-lg border border-border space-y-3">
              <h3 className="text-sm font-medium text-text">New Fee Entry</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Fee Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as FeeType })}
                    className="select w-full text-sm"
                  >
                    {(Object.keys(feeTypeLabels) as FeeType[]).map((t) => (
                      <option key={t} value={t}>{feeTypeLabels[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Amount ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="input w-full text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Date Paid (optional)</label>
                <input
                  type="date"
                  value={form.paidAt}
                  onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
                  className="input w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Receipt URL (optional)</label>
                <input
                  type="url"
                  value={form.receiptUrl}
                  onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })}
                  placeholder="https://..."
                  className="input w-full text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={saving || !form.amount}
                  className="btn btn-primary btn-sm flex-1"
                >
                  {saving ? 'Saving...' : 'Add Fee'}
                </button>
                <button
                  onClick={() => { setIsAdding(false); setForm(emptyForm); }}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Fee List */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-surface2 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : fees.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface2 flex items-center justify-center">
                <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-muted">No fees logged yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fees.map((fee) => (
                <div
                  key={fee.id}
                  className="flex items-center gap-3 p-3 bg-surface2 rounded-lg border border-border group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${feeTypeColors[fee.type as FeeType] ?? 'bg-muted/20 text-muted'}`}>
                        {feeTypeLabels[fee.type as FeeType] ?? fee.type}
                      </span>
                      {fee.paidAt ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Paid {formatDate(fee.paidAt)}
                        </span>
                      ) : (
                        <span className="text-xs text-warn">Unpaid</span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-text">{formatCurrency(Number(fee.amount))}</div>
                    {fee.receiptUrl && (
                      <a
                        href={fee.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline"
                      >
                        View receipt
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!fee.paidAt && (
                      <button
                        onClick={() => handleMarkPaid(fee)}
                        disabled={markingPaid === fee.id}
                        title="Mark as paid"
                        className="p-1.5 rounded-lg text-muted hover:text-success hover:bg-success/10 transition-colors text-xs"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(fee.id)}
                      title="Delete fee"
                      className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer totals */}
        <div className="p-4 border-t border-border bg-surface2">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-base font-bold text-text">{formatCurrency(totalCharged)}</div>
              <div className="text-xs text-muted">Total Charged</div>
            </div>
            <div>
              <div className="text-base font-bold text-success">{formatCurrency(totalPaid)}</div>
              <div className="text-xs text-muted">Paid</div>
            </div>
            <div>
              <div className={`text-base font-bold ${totalUnpaid > 0 ? 'text-warn' : 'text-muted'}`}>
                {formatCurrency(totalUnpaid)}
              </div>
              <div className="text-xs text-muted">Unpaid</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
