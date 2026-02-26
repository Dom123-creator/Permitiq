'use client';

import { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { EmailDraftQueue, EmailStatCards, EmailLog } from '@/components/email';
import { ComposeEmailModal } from '@/components/email/ComposeEmailModal';

export default function EmailsPage() {
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleComposed = () => {
    setShowComposeModal(false);
    setRefreshKey((k) => k + 1);
  };

  const handleAction = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-auto p-4 md:p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text">Emails</h1>
            <p className="text-sm text-muted mt-1">Draft, review, and track permit correspondence</p>
          </div>
          <button onClick={() => setShowComposeModal(true)} className="btn btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Compose
          </button>
        </div>

        {/* Stat Cards */}
        <EmailStatCards refreshKey={refreshKey} />

        {/* Draft Queue */}
        <EmailDraftQueue refreshKey={refreshKey} onAction={handleAction} />

        {/* Sent Email Log */}
        <div className="panel mt-6">
          <div className="panel-header">
            <div>
              <h2 className="text-lg font-semibold text-text">Sent Emails</h2>
              <p className="text-sm text-muted">History of approved and sent correspondence</p>
            </div>
          </div>
          <div className="p-4">
            <EmailLog refreshKey={refreshKey} />
          </div>
        </div>
      </main>

      {showComposeModal && (
        <ComposeEmailModal
          onClose={() => setShowComposeModal(false)}
          onSuccess={handleComposed}
        />
      )}
    </div>
  );
}
