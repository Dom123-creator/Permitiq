'use client';

import { useState, useEffect, useMemo } from 'react';

interface Project {
  id: string;
  name: string;
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

interface AddPermitModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PERMIT_TYPES = ['Building', 'Electrical', 'Plumbing', 'Mechanical', 'Fire'];

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

export function AddPermitModal({ onClose, onSuccess }: AddPermitModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allJurisdictions, setAllJurisdictions] = useState<JurisdictionEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    projectId: '',
    name: '',
    type: '',
    jurisdiction: '',
    authority: '',
    permitNumber: '',
    expiryDate: '',
    notes: '',
  });

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setProjects(data); })
      .catch(() => {});
    fetch('/api/markets')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data.jurisdictions)) setAllJurisdictions(data.jurisdictions); })
      .catch(() => {});
  }, []);

  // Fuzzy-match the typed jurisdiction against our DB
  const matchedJur = useMemo<JurisdictionEntry | null>(() => {
    if (!form.jurisdiction.trim() || allJurisdictions.length === 0) return null;
    const q = normalizeCity(form.jurisdiction);
    return allJurisdictions.find((j) => normalizeCity(j.city) === q) ?? null;
  }, [form.jurisdiction, allJurisdictions]);

  // Auto-fill authority when a jurisdiction is matched and authority is still empty
  useEffect(() => {
    if (matchedJur && !form.authority) {
      setForm((prev) => ({ ...prev, authority: matchedJur.ahjName }));
    }
  }, [matchedJur]);

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectId || !form.name || !form.type || !form.jurisdiction) {
      setError('Project, name, type, and jurisdiction are required.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/permits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: form.projectId,
          name: form.name,
          type: form.type,
          jurisdiction: form.jurisdiction,
          authority: form.authority || null,
          permitNumber: form.permitNumber || null,
          expiryDate: form.expiryDate || null,
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to create permit.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const reviewDays = matchedJur && form.type ? avgDaysForType(matchedJur, form.type) : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface z-10">
            <h2 className="text-lg font-semibold text-text">Add New Permit</h2>
            <button onClick={onClose} className="text-muted hover:text-text p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Project */}
            <div>
              <label className="block text-xs text-muted mb-1">Project *</label>
              <select value={form.projectId} onChange={set('projectId')} className="select w-full">
                <option value="">Select project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs text-muted mb-1">Permit Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Electrical Permit - Main Panel"
                className="input w-full"
              />
            </div>

            {/* Type + Jurisdiction */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Type *</label>
                <select value={form.type} onChange={set('type')} className="select w-full">
                  <option value="">Select type...</option>
                  {PERMIT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Jurisdiction *</label>
                <input
                  type="text"
                  list="add-jurisdictions-list"
                  value={form.jurisdiction}
                  onChange={set('jurisdiction')}
                  placeholder="e.g. Austin"
                  className="input w-full"
                />
                <datalist id="add-jurisdictions-list">
                  {allJurisdictions.map((j) => (
                    <option key={j.id} value={j.city}>{j.city}, {j.state}</option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* AHJ Preview card — shown when jurisdiction matches DB */}
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
                {reviewDays !== null && (
                  <div className="flex items-center gap-2 pt-1 border-t border-accent/10">
                    <span className="text-xs text-muted">Expected review:</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                      reviewDays <= 7 ? 'bg-success/15 text-success' :
                      reviewDays <= 14 ? 'bg-accent/15 text-accent' :
                      reviewDays <= 21 ? 'bg-warn/15 text-warn' :
                      'bg-danger/15 text-danger'
                    }`}>
                      ~{reviewDays} days ({form.type})
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Authority + Permit Number */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">
                  Authority (AHJ)
                  {matchedJur && <span className="ml-1 text-accent">· auto-filled</span>}
                </label>
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

            {/* Expiry Date */}
            <div>
              <label className="block text-xs text-muted mb-1">Expiry Date</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={set('expiryDate')}
                className="input w-full"
              />
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

            <div className="flex items-center gap-3 pt-1">
              <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1">
                {isSubmitting ? 'Creating...' : 'Create Permit'}
              </button>
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
