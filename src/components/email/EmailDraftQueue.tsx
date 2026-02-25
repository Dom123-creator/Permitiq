'use client';

import { useState, useEffect } from 'react';
import {
  EmailDraft,
  EmailStatus,
  EmailTemplateType,
  statusConfig,
  templateTypeLabels,
} from './EmailTypes';
import { EmailDraftModal } from './EmailDraftModal';

interface EmailDraftQueueProps {
  refreshKey?: number;
  onAction?: () => void;
}

export function EmailDraftQueue({ refreshKey, onAction }: EmailDraftQueueProps) {
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'agent'>('all');

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/emails')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setDrafts(data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [refreshKey]);

  const filteredDrafts = drafts.filter((draft) => {
    if (filter === 'pending') return draft.status === 'pending-review';
    if (filter === 'agent') return draft.createdBy === 'agent';
    return draft.status !== 'sent' && draft.status !== 'rejected';
  });

  const pendingCount = drafts.filter((d) => d.status === 'pending-review').length;
  const agentCount = drafts.filter((d) => d.createdBy === 'agent' && d.status !== 'sent').length;
  const allActiveCount = drafts.filter((d) => d.status !== 'sent' && d.status !== 'rejected').length;

  const formatTimeAgo = (date: Date | string): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleApprove = async (draft: EmailDraft) => {
    const res = await fetch(`/api/emails/${draft.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: draft.subject,
        body: draft.body,
        recipient: draft.recipient,
        recipientName: draft.recipientName,
        status: 'sent',
        sentAt: new Date().toISOString(),
      }),
    });
    if (res.ok) {
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
      setSelectedDraft(null);
      onAction?.();
    }
  };

  const handleReject = async (draftId: string) => {
    const res = await fetch(`/api/emails/${draftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' }),
    });
    if (res.ok) {
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      setSelectedDraft(null);
      onAction?.();
    }
  };

  const handleSave = async (draft: EmailDraft) => {
    const res = await fetch(`/api/emails/${draft.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: draft.subject,
        body: draft.body,
        recipient: draft.recipient,
        recipientName: draft.recipientName,
      }),
    });
    if (res.ok) {
      setDrafts((prev) => prev.map((d) => (d.id === draft.id ? draft : d)));
    }
  };

  if (isLoading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h2 className="text-lg font-semibold text-text">Email Draft Queue</h2>
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-4 p-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-surface2" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-surface2 rounded w-3/4" />
                <div className="h-3 bg-surface2 rounded w-1/2" />
                <div className="flex gap-2">
                  <div className="h-5 w-20 bg-surface2 rounded-full" />
                  <div className="h-5 w-16 bg-surface2 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="text-lg font-semibold text-text">Email Draft Queue</h2>
            <p className="text-sm text-muted">Review and approve email drafts before sending</p>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-warn/20 text-warn text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-warn animate-pulse" />
                {pendingCount} pending review
              </span>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-4 py-3 border-b border-border">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === 'all' ? 'bg-accent text-bg' : 'text-muted hover:text-text hover:bg-surface2'
            }`}
          >
            All Drafts ({allActiveCount})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === 'pending' ? 'bg-accent text-bg' : 'text-muted hover:text-text hover:bg-surface2'
            }`}
          >
            Pending Review ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('agent')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === 'agent' ? 'bg-accent text-bg' : 'text-muted hover:text-text hover:bg-surface2'
            }`}
          >
            Agent Generated ({agentCount})
          </button>
        </div>

        {/* Draft List */}
        <div className="divide-y divide-border">
          {filteredDrafts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface2 flex items-center justify-center">
                <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-muted">No drafts to review</p>
            </div>
          ) : (
            filteredDrafts.map((draft) => {
              const statusCfg = statusConfig[draft.status as EmailStatus] ?? { label: String(draft.status), class: 'bg-muted/20 text-muted' };
              const tmplLabel = templateTypeLabels[draft.templateType as EmailTemplateType] ?? String(draft.templateType ?? 'custom');
              return (
                <div
                  key={draft.id}
                  onClick={() => setSelectedDraft(draft)}
                  className="flex items-start gap-4 p-4 cursor-pointer hover:bg-surface2 transition-colors"
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    draft.createdBy === 'agent' ? 'bg-purple/20' : 'bg-accent/20'
                  }`}>
                    {draft.createdBy === 'agent' ? (
                      <span className="text-purple">⚡</span>
                    ) : (
                      <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-text truncate">{draft.subject}</p>
                    </div>
                    <p className="text-xs text-muted truncate mb-2">
                      To: {draft.recipientName || draft.recipient || '—'}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${statusCfg.class}`}>{statusCfg.label}</span>
                      <span className="text-xs text-muted">{tmplLabel}</span>
                      <span className="text-xs text-muted">•</span>
                      <span className="text-xs text-muted">{formatTimeAgo(draft.createdAt)}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="text-muted">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedDraft && (
        <EmailDraftModal
          draft={selectedDraft}
          isOpen={!!selectedDraft}
          onClose={() => setSelectedDraft(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onSave={handleSave}
        />
      )}
    </>
  );
}
