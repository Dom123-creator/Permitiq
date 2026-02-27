'use client';

import { useState, useEffect, useMemo } from 'react';

interface Permit {
  id: string;
  name: string;
  type: string;
  jurisdiction: string;
  status: string;
  authority?: string | null;
  permitNumber?: string | null;
  expiryDate: Date | null;
  feeBudgeted?: number | null;
  notes?: string | null;
}

interface JurisdictionEntry {
  id: string;
  city: string;
  state: string;
  metro: string;
  ahjName: string;
  portalUrl: string | null;
  avgReviewDaysBuilding: number | null;
  avgReviewDaysElectrical: number | null;
  avgReviewDaysPlumbing: number | null;
  avgReviewDaysMechanical: number | null;
  avgReviewDaysFire: number | null;
}

interface EditPermitModalProps {
  permit: Permit;
  onClose: () => void;
  onSuccess: () => void;
}

const PERMIT_TYPES = ['Building', 'Electrical', 'Plumbing', 'Mechanical', 'Fire'];
const PERMIT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'under-review', label: 'Under Review' },
  { value: 'info-requested', label: 'Info Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function avgDaysForType(jur: JurisdictionEntry, type: string): number | null {
  const t = type.toLowerCase();
  if (t === 'building') return jur.avgReviewDaysBuilding;
  if (t === 'electrical') return jur.avgReviewDaysElectrical;
  if (t === 'plumbing') return jur.avgReviewDaysPlumbing;
  if (t === 'mechanical') return jur.avgReviewDaysMechanical;
  if (t === 'fire') return jur.avgReviewDaysFire;
  return null;
}

function normalizeCity(s: string) {
  return s.toLowerCase()
    .replace(/\s*\(unincorporated\)\s*/gi, '')
    .replace(/\s*\/\s*.+$/, '')
    .trim();
}

function toDateInputValue(date: Date | null): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

export function EditPermitModal({ permit, onClose, onSuccess }: EditPermitModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [allJurisdictions, setAllJurisdictions] = useState<JurisdictionEntry[]>([]);

  useEffect(() => {
    fetch('/api/markets')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data.jurisdictions)) setAllJurisdictions(data.jurisdictions); })
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({
    name: permit.name,
    type: permit.type,
    jurisdiction: permit.jurisdiction,
    status: permit.status,
    authority: permit.authority ?? '',
    permitNumber: permit.permitNumber ?? '',
    expiryDate: toDateInputValue(permit.expiryDate),
    feeBudgeted: permit.feeBudgeted != null ? String(permit.feeBudgeted) : '',
    notes: permit.notes ?? '',
  });

  // Re-initialize form when a different permit is passed in
  useEffect(() => {
    setForm({
      name: permit.name,
      type: permit.type,
      jurisdiction: permit.jurisdiction,
      status: permit.status,
      authority: permit.authority ?? '',
      permitNumber: permit.permitNumber ?? '',
      expiryDate: toDateInputValue(permit.expiryDate),
      feeBudgeted: permit.feeBudgeted != null ? String(permit.feeBudgeted) : '',
      notes: permit.notes ?? '',
    });
    setError('');
  }, [permit.id]);

  // Fuzzy-match typed jurisdiction against DB
  const matchedJur = useMemo<JurisdictionEntry | null>(() => {
    if (!form.jurisdiction.trim() || allJurisdictions.length === 0) return null;
    const q = normalizeCity(form.jurisdiction);
    return allJurisdictions.find((j) => normalizeCity(j.city) === q) ?? null;
  }, [form.jurisdiction, allJurisdictions]);

  const set =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type || !form.jurisdiction || !form.status) {
      setError('Name, type, jurisdiction, and status are required.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/permits/${permit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          jurisdiction: form.jurisdiction,
          status: form.status,
          authority: form.authority || null,
          permitNumber: form.permitNumber || null,
          expiryDate: form.expiryDate || null,
          feeBudgeted: form.feeBudgeted ? Number(form.feeBudgeted) : null,
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to update permit.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface z-10">
            <div>
              <h2 className="text-lg font-semibold text-text">Edit Permit</h2>
              <p className="text-xs text-muted mt-0.5 truncate max-w-xs">{permit.name}</p>
            </div>
            <button onClick={onClose} className="text-muted hover:text-text p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs text-muted mb-1">Permit Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                className="input w-full"
              />
            </div>

            {/* Type + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Type *</label>
                <select value={form.type} onChange={set('type')} className="select w-full">
                  {PERMIT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Status *</label>
                <select value={form.status} onChange={set('status')} className="select w-full">
                  {PERMIT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Jurisdiction */}
            <div>
              <label className="block text-xs text-muted mb-1">Jurisdiction *</label>
              <input
                type="text"
                list="edit-jurisdictions-list"
                value={form.jurisdiction}
                onChange={set('jurisdiction')}
                className="input w-full"
              />
              <datalist id="edit-jurisdictions-list">
                {allJurisdictions.map((j) => (
                  <option key={j.id} value={j.city}>{j.city}, {j.state}</option>
                ))}
              </datalist>
            </div>

            {/* AHJ Preview card */}
            {matchedJur && (
              <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-accent">AHJ Matched</div>
                    <div className="text-xs text-text mt-0.5">{matchedJur.ahjName}</div>
                    <div className="text-xs text-muted">{matchedJur.metro} · {matchedJur.state}</div>
                  </div>
                  {matchedJur.portalUrl && (
                    <a
                      href={matchedJur.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-xs bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Portal
                    </a>
                  )}
                </div>
                {form.type && avgDaysForType(matchedJur, form.type) !== null && (
                  <div className="flex items-center gap-2 pt-1 border-t border-accent/10">
                    <span className="text-xs text-muted">Expected review:</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                      (avgDaysForType(matchedJur, form.type) ?? 99) <= 7 ? 'bg-success/15 text-success' :
                      (avgDaysForType(matchedJur, form.type) ?? 99) <= 14 ? 'bg-accent/15 text-accent' :
                      (avgDaysForType(matchedJur, form.type) ?? 99) <= 21 ? 'bg-warn/15 text-warn' :
                      'bg-danger/15 text-danger'
                    }`}>
                      ~{avgDaysForType(matchedJur, form.type)} days ({form.type})
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Authority + Permit Number */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Authority (AHJ)</label>
                <input
                  type="text"
                  value={form.authority}
                  onChange={set('authority')}
                  placeholder="e.g. City of Houston"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Permit Number</label>
                <input
                  type="text"
                  value={form.permitNumber}
                  onChange={set('permitNumber')}
                  placeholder="e.g. BP-2026-001234"
                  className="input w-full"
                />
              </div>
            </div>

            {/* Expiry Date + Fee Budgeted */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={set('expiryDate')}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Fee Budgeted ($)</label>
                <input
                  type="number"
                  value={form.feeBudgeted}
                  onChange={set('feeBudgeted')}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="input w-full"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs text-muted mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={2}
                placeholder="Optional notes..."
                className="input w-full"
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary flex-1"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={onClose} className="btn btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
