'use client';

import { AuditLog } from './AuditLog';

interface AuditPanelProps {
  permitId: string;
  permitName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditPanel({ permitId, permitName, isOpen, onClose }: AuditPanelProps) {
  if (!isOpen) return null;

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    alert('PDF export functionality - coming soon!');
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[520px] bg-surface border-l border-border z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-text">Audit History</h2>
            <p className="text-sm text-muted truncate">{permitName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="btn btn-secondary btn-sm"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
            <button onClick={onClose} className="text-muted hover:text-text p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <AuditLog permitId={permitId} showFilters={true} />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface2">
          <p className="text-xs text-muted text-center">
            Audit log is retained indefinitely for compliance purposes
          </p>
        </div>
      </div>
    </>
  );
}
