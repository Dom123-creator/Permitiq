'use client';

import { useState, useEffect } from 'react';
import { emailTemplates, EmailTemplateType, templateTypeLabels } from './EmailTypes';

interface Permit {
  id: string;
  name: string;
  type: string;
  jurisdiction: string;
  permitNumber: string | null;
  projectName: string;
  daysInQueue: number;
  avgDays: number;
  submittedAt?: string | null;
}

interface ComposeEmailModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const JURISDICTION_CONTACTS: Record<string, { email: string; name: string }> = {
  'Houston': { email: 'permits@houstontx.gov', name: 'City of Houston Permit Office' },
  'Harris County': { email: 'permits@harriscountytx.gov', name: 'Harris County Permit Office' },
  'Austin': { email: 'permits@austintexas.gov', name: 'Austin Development Services' },
  'Dallas': { email: 'permits@dallascityhall.com', name: 'Dallas Development Services' },
  'San Antonio': { email: 'permits@sanantonio.gov', name: 'San Antonio Development Services' },
};

function fillTemplate(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [key, val]) => t.split(`{{${key}}}`).join(val),
    text
  );
}

export function ComposeEmailModal({ onClose, onSuccess }: ComposeEmailModalProps) {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [selectedPermitId, setSelectedPermitId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateType | ''>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipient, setRecipient] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/permits')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPermits(data); })
      .catch(() => {});
  }, []);

  const selectedPermit = permits.find((p) => p.id === selectedPermitId);

  // Auto-fill template + recipient when permit or template changes
  useEffect(() => {
    if (!selectedTemplate || !selectedPermit) return;

    const tmpl = emailTemplates.find((t) => t.type === selectedTemplate);
    if (!tmpl) return;

    const vars: Record<string, string> = {
      permitNumber: selectedPermit.permitNumber ?? 'N/A',
      projectName: selectedPermit.projectName,
      daysInQueue: String(selectedPermit.daysInQueue),
      avgDays: String(selectedPermit.avgDays),
      permitType: selectedPermit.type,
      jurisdiction: selectedPermit.jurisdiction,
      submitDate: selectedPermit.submittedAt
        ? new Date(selectedPermit.submittedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : 'N/A',
      recipientName: recipientName || '[Permit Office]',
      senderName: '[Your Name]',
      companyName: '[Company Name]',
      contactPhone: '[Phone]',
      requestDate: '[Request Date]',
      responseDetails: '[Details here]',
      hearingDate: '[Hearing Date]',
      actionItems: '- [Action item 1]\n- [Action item 2]',
      expiryDate: '[Expiry Date]',
      daysUntilExpiry: '[Days]',
    };

    setSubject(fillTemplate(tmpl.subject, vars));
    setBody(fillTemplate(tmpl.body, vars));

    // Auto-suggest recipient from jurisdiction
    const contact = JURISDICTION_CONTACTS[selectedPermit.jurisdiction];
    if (contact) {
      setRecipient(contact.email);
      setRecipientName(contact.name);
    }
  }, [selectedTemplate, selectedPermitId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setError('Subject and message body are required.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permitId: selectedPermitId || null,
          subject: subject.trim(),
          emailBody: body.trim(),
          recipient: recipient.trim() || null,
          recipientName: recipientName.trim() || null,
          templateType: selectedTemplate || 'custom',
          createdBy: 'user',
        }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to create draft.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[680px] md:max-h-[90vh] bg-surface border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-text">Compose Email</h2>
            <p className="text-xs text-muted mt-0.5">Saved as a draft — review before sending</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-5 space-y-4">
          {/* Template + Permit row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value as EmailTemplateType)}
                className="select w-full text-sm"
              >
                <option value="">Custom / No template</option>
                {emailTemplates.map((t) => (
                  <option key={t.id} value={t.type}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Permit (optional)</label>
              <select
                value={selectedPermitId}
                onChange={(e) => setSelectedPermitId(e.target.value)}
                className="select w-full text-sm"
              >
                <option value="">No permit linked</option>
                {permits.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Recipient */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">To (email)</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="permits@example.gov"
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Recipient Name</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Permit Office"
                className="input w-full text-sm"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs text-muted mb-1">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              className="input w-full text-sm"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs text-muted mb-1">Message *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Email body..."
              className="input w-full text-sm font-mono"
            />
          </div>

          {selectedTemplate && selectedPermit && (
            <p className="text-xs text-accent">
              Template filled with data from <strong>{selectedPermit.name}</strong>.
              Replace <code className="text-warn">[bracketed]</code> placeholders before sending.
            </p>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-surface2 flex-shrink-0">
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? 'Saving...' : 'Save as Draft'}
          </button>
        </div>
      </div>
    </>
  );
}
