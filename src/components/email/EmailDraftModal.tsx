'use client';

import { useState, useEffect } from 'react';
import {
  EmailDraft,
  EmailStatus,
  EmailTemplateType,
  statusConfig,
  templateTypeLabels,
} from './EmailTypes';

interface EmailDraftModalProps {
  draft: EmailDraft;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (draft: EmailDraft) => void;
  onReject: (draftId: string, reason?: string) => void;
  onSave: (draft: EmailDraft) => void;
}

export function EmailDraftModal({
  draft,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onSave,
}: EmailDraftModalProps) {
  const [editedDraft, setEditedDraft] = useState<EmailDraft>(draft);
  const [isEditing, setIsEditing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    setEditedDraft(draft);
    setIsEditing(false);
    setShowRejectForm(false);
  }, [draft]);

  const statusCfg = statusConfig[draft.status as EmailStatus] ?? { label: String(draft.status), class: 'bg-muted/20 text-muted' };
  const tmplLabel = templateTypeLabels[draft.templateType as EmailTemplateType] ?? String(draft.templateType ?? 'custom');

  if (!isOpen) return null;

  const handleApprove = () => {
    onApprove(editedDraft);
  };

  const handleReject = () => {
    onReject(draft.id, rejectReason);
    setShowRejectForm(false);
  };

  const handleSave = () => {
    onSave(editedDraft);
    setIsEditing(false);
  };

  const formatDate = (date: Date | string): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[700px] md:max-h-[85vh] bg-surface border border-border rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">Review Email Draft</h2>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className={`badge ${statusCfg.class}`}>
                  {statusCfg.label}
                </span>
                <span>•</span>
                <span>{tmplLabel}</span>
                {draft.createdBy === 'agent' && (
                  <>
                    <span>•</span>
                    <span className="text-purple">⚡ AI Generated</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Email Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted uppercase tracking-wide mb-1">To</label>
              {isEditing ? (
                <input
                  type="email"
                  value={editedDraft.recipient ?? ''}
                  onChange={(e) => setEditedDraft({ ...editedDraft, recipient: e.target.value })}
                  className="input text-sm"
                />
              ) : (
                <p className="text-sm text-text">
                  {editedDraft.recipientName ? `${editedDraft.recipientName} <${editedDraft.recipient}>` : editedDraft.recipient}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-muted uppercase tracking-wide mb-1">Created</label>
              <p className="text-sm text-text">{formatDate(draft.createdAt)}</p>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs text-muted uppercase tracking-wide mb-1">Subject</label>
            {isEditing ? (
              <input
                type="text"
                value={editedDraft.subject}
                onChange={(e) => setEditedDraft({ ...editedDraft, subject: e.target.value })}
                className="input text-sm"
              />
            ) : (
              <p className="text-sm font-medium text-text">{editedDraft.subject}</p>
            )}
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs text-muted uppercase tracking-wide mb-1">Message</label>
            {isEditing ? (
              <textarea
                value={editedDraft.body}
                onChange={(e) => setEditedDraft({ ...editedDraft, body: e.target.value })}
                rows={12}
                className="input text-sm font-mono"
              />
            ) : (
              <div className="p-4 bg-surface2 border border-border rounded-lg">
                <pre className="text-sm text-text whitespace-pre-wrap font-sans">
                  {editedDraft.body}
                </pre>
              </div>
            )}
          </div>

          {/* CC Recipients */}
          {editedDraft.cc && editedDraft.cc.length > 0 && (
            <div>
              <label className="block text-xs text-muted uppercase tracking-wide mb-1">CC</label>
              <p className="text-sm text-muted">{editedDraft.cc.join(', ')}</p>
            </div>
          )}

          {/* Reject Form */}
          {showRejectForm && (
            <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg space-y-3">
              <h4 className="text-sm font-medium text-danger">Reject this draft?</h4>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Optional: Explain why this draft was rejected..."
                rows={3}
                className="input text-sm"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReject}
                  className="btn btn-danger btn-sm"
                >
                  Confirm Reject
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-surface2">
          {draft.status === 'pending-review' || draft.status === 'draft' ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button onClick={handleSave} className="btn btn-primary btn-sm">
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setEditedDraft(draft);
                        setIsEditing(false);
                      }}
                      className="btn btn-ghost btn-sm"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn btn-secondary btn-sm"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                )}
              </div>

              {!isEditing && !showRejectForm && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="btn btn-ghost btn-sm text-danger"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    className="btn btn-primary"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve & Send
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted">
                {draft.status === 'sent' && draft.sentAt && (
                  <span>Sent on {formatDate(draft.sentAt)}</span>
                )}
                {draft.status === 'rejected' && (
                  <span className="text-danger">This draft was rejected</span>
                )}
              </div>
              <button onClick={onClose} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
