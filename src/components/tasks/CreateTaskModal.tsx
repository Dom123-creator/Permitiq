'use client';

import { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
}

interface Permit {
  id: string;
  name: string;
}

interface CreateTaskModalProps {
  onClose: () => void;
  onSuccess: () => void;
  /** Pre-select a permit when opened from the permit row "+ Task" button */
  defaultPermitId?: string;
  defaultProjectId?: string;
}

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const TASK_TYPES = [
  { value: 'manual', label: '✏️ Manual' },
  { value: 'auto', label: '⚡ Auto-Generated' },
];

export function CreateTaskModal({
  onClose,
  onSuccess,
  defaultPermitId = '',
  defaultProjectId = '',
}: CreateTaskModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [permits, setPermits] = useState<Permit[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [projectId, setProjectId] = useState(defaultProjectId);
  const [form, setForm] = useState({
    title: '',
    permitId: defaultPermitId,
    type: 'manual',
    priority: 'medium',
    dueDate: '',
    notes: '',
  });

  // Load projects once on mount
  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setProjects(data); })
      .catch(() => {});
  }, []);

  // Load permits when project selection changes
  useEffect(() => {
    if (!projectId) {
      setPermits([]);
      setForm((prev) => ({ ...prev, permitId: '' }));
      return;
    }
    fetch(`/api/permits?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPermits(data); })
      .catch(() => {});
  }, [projectId]);

  const set =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Task title is required.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          projectId: projectId || null,
          permitId: form.permitId || null,
          type: form.type,
          priority: form.priority,
          dueDate: form.dueDate || null,
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to create task.');
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
            <h2 className="text-lg font-semibold text-text">Create Task</h2>
            <button onClick={onClose} className="text-muted hover:text-text p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs text-muted mb-1">Task Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={set('title')}
                placeholder="e.g. Submit response to correction notice"
                className="input w-full"
                autoFocus
              />
            </div>

            {/* Project */}
            <div>
              <label className="block text-xs text-muted mb-1">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="select w-full"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Permit — only shown when a project is selected */}
            {projectId && (
              <div>
                <label className="block text-xs text-muted mb-1">Permit (optional)</label>
                <select
                  value={form.permitId}
                  onChange={set('permitId')}
                  className="select w-full"
                >
                  <option value="">No specific permit</option>
                  {permits.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Type + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Type</label>
                <select value={form.type} onChange={set('type')} className="select w-full">
                  {TASK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Priority</label>
                <select value={form.priority} onChange={set('priority')} className="select w-full">
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs text-muted mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={set('dueDate')}
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

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary flex-1"
              >
                {isSubmitting ? 'Creating...' : 'Create Task'}
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
