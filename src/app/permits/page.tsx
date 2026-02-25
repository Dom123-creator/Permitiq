'use client';

import { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { PermitTracker } from '@/components/dashboard/PermitTracker';
import { PermitStatCards, AddPermitModal } from '@/components/permits';

export default function PermitsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePermitAdded = () => {
    setShowAddModal(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-auto p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text">Permits</h1>
            <p className="text-sm text-muted mt-1">
              Track all active permits across projects and jurisdictions
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Permit
          </button>
        </div>

        {/* Stat Cards */}
        <PermitStatCards refreshKey={refreshKey} />

        {/* Permit Table — key forces remount/refetch after a new permit is added */}
        <PermitTracker key={refreshKey} />

        {/* Add Permit Modal */}
        {showAddModal && (
          <AddPermitModal
            onClose={() => setShowAddModal(false)}
            onSuccess={handlePermitAdded}
          />
        )}
      </main>
    </div>
  );
}
