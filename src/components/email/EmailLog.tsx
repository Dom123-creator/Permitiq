'use client';

import { useState, useEffect } from 'react';
import { EmailDraft, EmailTemplateType, templateTypeLabels } from './EmailTypes';

interface EmailLogProps {
  permitId?: string;
  limit?: number;
  refreshKey?: number;
}

export function EmailLog({ permitId, limit, refreshKey }: EmailLogProps) {
  const [emails, setEmails] = useState<EmailDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/emails?status=sent')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setEmails(permitId ? data.filter((e) => e.permitId === permitId) : data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [permitId, refreshKey]);

  const displayEmails = limit ? emails.slice(0, limit) : emails;

  const formatDate = (date: Date | string): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="bg-surface2 border border-border rounded-lg p-3 animate-pulse flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-border" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-border rounded w-3/4" />
              <div className="h-3 bg-border rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface2 flex items-center justify-center">
          <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm text-muted">No emails sent yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayEmails.map((email) => {
        const tmplLabel = templateTypeLabels[email.templateType as EmailTemplateType] ?? String(email.templateType ?? 'Custom');
        return (
          <div key={email.id} className="bg-surface2 border border-border rounded-lg overflow-hidden">
            <div
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-border/30 transition-colors"
              onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
            >
              {/* Icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                email.createdBy === 'agent' ? 'bg-purple/20' : 'bg-success/20'
              }`}>
                {email.createdBy === 'agent' ? (
                  <span className="text-purple text-xs">⚡</span>
                ) : (
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{email.subject}</p>
                <p className="text-xs text-muted">
                  To: {email.recipientName || email.recipient || '—'} •{' '}
                  {email.sentAt ? formatDate(email.sentAt) : formatDate(email.createdAt)}
                </p>
              </div>

              {/* Type Badge */}
              <span className="badge bg-muted/20 text-muted text-xs">{tmplLabel}</span>

              {/* Expand Arrow */}
              <svg
                className={`w-4 h-4 text-muted transition-transform ${expandedId === email.id ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Expanded Body */}
            {expandedId === email.id && (
              <div className="px-3 pb-3 pt-1 border-t border-border">
                <div className="p-3 bg-card rounded-lg mt-2">
                  <pre className="text-xs text-text whitespace-pre-wrap font-sans">{email.body}</pre>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {limit && emails.length > limit && (
        <button className="w-full text-center text-xs text-accent hover:underline py-2">
          View all {emails.length} emails
        </button>
      )}
    </div>
  );
}
