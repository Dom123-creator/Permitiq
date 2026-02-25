'use client';

import { useState, useEffect, useCallback } from 'react';
import { InspectionLog } from './InspectionLog';
import { Inspection, InspectionResult } from './InspectionTypes';

interface InspectionPanelProps {
  permitId: string;
  permitName: string;
  permitType: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InspectionPanel({
  permitId,
  permitName,
  permitType,
  isOpen,
  onClose,
}: InspectionPanelProps) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadInspections = useCallback(async () => {
    if (!isOpen) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/inspections?permitId=${permitId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setInspections(
          data.map((i) => ({
            ...i,
            scheduledDate: i.scheduledDate ? new Date(i.scheduledDate) : null,
            completedDate: null,
            sequenceOrder: 0,
            createdAt: new Date(i.createdAt),
            result: (i.result as InspectionResult) ?? 'scheduled',
          }))
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [permitId, isOpen]);

  useEffect(() => { loadInspections(); }, [loadInspections]);

  if (!isOpen) return null;

  const passed = inspections.filter((i) => i.result === 'pass').length;
  const failed = inspections.filter((i) => i.result === 'fail').length;
  const scheduled = inspections.filter((i) => !i.result || i.result === 'scheduled').length;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-[520px] bg-surface border-l border-border z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-text">Inspections</h2>
            <p className="text-sm text-muted truncate">{permitName}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <InspectionLog
            permitId={permitId}
            permitType={permitType}
            inspections={inspections}
            isLoading={isLoading}
            onScheduled={loadInspections}
            onResultUpdated={loadInspections}
          />
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-border bg-surface2">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-success">{passed}</div>
              <div className="text-xs text-muted">Passed</div>
            </div>
            <div>
              <div className="text-lg font-bold text-danger">{failed}</div>
              <div className="text-xs text-muted">Failed</div>
            </div>
            <div>
              <div className="text-lg font-bold text-accent">{scheduled}</div>
              <div className="text-xs text-muted">Scheduled</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
