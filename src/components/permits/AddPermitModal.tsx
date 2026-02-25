'use client';

import { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
}

interface AddPermitModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PERMIT_TYPES = ['Building', 'Electrical', 'Plumbing', 'Mechanical', 'Fire'];
const JURISDICTIONS = ['Houston', 'Harris County', 'Austin', 'Dallas', 'San Antonio'];

export function AddPermitModal({ onClose, onSuccess }: AddPermitModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
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
  }, []);

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

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="text-lg font-semibold text-text">Add New Permit</h2>
            <button onClick={onClose} className="text-muted hover:text-text p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
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
                  list="jurisdictions"
                  value={form.jurisdiction}
                  onChange={set('jurisdiction')}
                  placeholder="e.g. Houston"
                  className="input w-full"
                />
                <datalist id="jurisdictions">
                  {JURISDICTIONS.map((j) => <option key={j} value={j} />)}
                </datalist>
              </div>
            </div>

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

            {error && (
              <p className="text-sm text-danger">{error}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary flex-1"
              >
                {isSubmitting ? 'Creating...' : 'Create Permit'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
