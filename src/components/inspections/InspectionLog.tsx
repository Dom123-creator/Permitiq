'use client';

import { useState } from 'react';
import {
  Inspection,
  InspectionType,
  InspectionResult,
  inspectionTypeLabels,
  resultConfig,
} from './InspectionTypes';

interface InspectionLogProps {
  permitId: string;
  permitType: string;
  inspections: Inspection[];
  isLoading?: boolean;
  onScheduled?: () => void;     // called after a successful schedule
  onResultUpdated?: () => void; // called after a successful result update
}

const RESULT_ORDER: InspectionResult[] = ['pass', 'fail', 'partial', 'scheduled', 'cancelled'];

function sortInspections(list: Inspection[]): Inspection[] {
  return [...list].sort((a, b) => {
    if (a.scheduledDate && b.scheduledDate) {
      return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
    }
    if (a.scheduledDate) return -1;
    if (b.scheduledDate) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function InspectionLog({
  permitId,
  permitType,
  inspections,
  isLoading = false,
  onScheduled,
  onResultUpdated,
}: InspectionLogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Schedule form state
  const [scheduleType, setScheduleType] = useState<InspectionType | ''>('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleInspector, setScheduleInspector] = useState('');
  const [scheduleContact, setScheduleContact] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const sorted = sortInspections(inspections);
  const passed = inspections.filter((i) => i.result === 'pass').length;
  const progress = inspections.length > 0 ? Math.round((passed / inspections.length) * 100) : 0;

  const formatDate = (date: Date | string | null): string => {
    if (!date) return '—';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    }).format(new Date(date));
  };

  const handleResultUpdate = async (inspectionId: string, result: InspectionResult) => {
    setUpdatingId(inspectionId);
    try {
      const res = await fetch(`/api/inspections/${inspectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result }),
      });
      if (res.ok) onResultUpdated?.();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleType) return;
    setIsScheduling(true);
    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permitId,
          type: scheduleType,
          scheduledDate: scheduleDate || null,
          inspectorName: scheduleInspector || null,
          inspectorContact: scheduleContact || null,
          notes: scheduleNotes || null,
        }),
      });
      if (res.ok) {
        setShowScheduleForm(false);
        setScheduleType('');
        setScheduleDate('');
        setScheduleInspector('');
        setScheduleContact('');
        setScheduleNotes('');
        onScheduled?.();
      }
    } finally {
      setIsScheduling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-surface2 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      {inspections.length > 0 && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text">Inspection Progress</h3>
            <p className="text-xs text-muted">
              {passed} of {inspections.length} passed
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-surface2 rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-medium text-text">{progress}%</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {inspections.length === 0 && !showScheduleForm && (
        <div className="py-6 text-center">
          <p className="text-sm text-muted mb-2">No inspections scheduled yet</p>
          <button
            onClick={() => setShowScheduleForm(true)}
            className="text-accent text-sm hover:underline"
          >
            Schedule the first inspection
          </button>
        </div>
      )}

      {/* Inspection Timeline */}
      {sorted.length > 0 && (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-3">
            {sorted.map((inspection) => {
              const result: InspectionResult = (inspection.result as InspectionResult) ?? 'scheduled';
              const config = resultConfig[result] ?? resultConfig['scheduled'];
              const isExpanded = expandedId === inspection.id;
              const isUpdating = updatingId === inspection.id;

              // Display the type label — fall back to raw value if not in the map
              const typeLabel =
                inspectionTypeLabels[inspection.type as InspectionType] ?? inspection.type;

              return (
                <div key={inspection.id} className="relative pl-12">
                  {/* Timeline Node */}
                  <div className={`absolute left-3 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${
                    result === 'pass' ? 'bg-success border-success text-bg'
                    : result === 'fail' ? 'bg-danger border-danger text-white'
                    : result === 'partial' ? 'bg-warn border-warn text-bg'
                    : 'bg-surface border-border text-muted'
                  }`}>
                    {config.icon}
                  </div>

                  <div className={`bg-surface2 border rounded-lg overflow-hidden transition-colors ${
                    isExpanded ? 'border-accent' : 'border-border'
                  }`}>
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-border/30"
                      onClick={() => setExpandedId(isExpanded ? null : inspection.id)}
                    >
                      <div>
                        <p className="text-sm font-medium text-text">{typeLabel}</p>
                        <p className="text-xs text-muted">
                          {inspection.scheduledDate ? formatDate(inspection.scheduledDate) : 'Not scheduled'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${config.class}`}>{config.label}</span>
                        <svg
                          className={`w-4 h-4 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-border space-y-3">
                        {inspection.inspectorName && (
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <span className="text-muted">Inspector: </span>
                              <span className="text-text">{inspection.inspectorName}</span>
                            </div>
                            {inspection.inspectorContact && (
                              <div>
                                <span className="text-muted">Contact: </span>
                                <span className="text-accent">{inspection.inspectorContact}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {inspection.notes && (
                          <div className="p-2 bg-card rounded text-xs text-text">
                            {inspection.notes}
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          {(result === 'scheduled' || result === null) && (
                            <>
                              <button
                                disabled={isUpdating}
                                onClick={() => handleResultUpdate(inspection.id, 'pass')}
                                className="btn btn-sm bg-success/20 text-success hover:bg-success/30"
                              >
                                Mark Passed
                              </button>
                              <button
                                disabled={isUpdating}
                                onClick={() => handleResultUpdate(inspection.id, 'fail')}
                                className="btn btn-sm bg-danger/20 text-danger hover:bg-danger/30"
                              >
                                Mark Failed
                              </button>
                              <button
                                disabled={isUpdating}
                                onClick={() => handleResultUpdate(inspection.id, 'partial')}
                                className="btn btn-sm bg-warn/20 text-warn hover:bg-warn/30"
                              >
                                Partial
                              </button>
                            </>
                          )}
                          {result === 'fail' && (
                            <button
                              onClick={() => { setShowScheduleForm(true); setExpandedId(null); }}
                              className="btn btn-primary btn-sm"
                            >
                              Schedule Re-inspection
                            </button>
                          )}
                          {result === 'partial' && (
                            <button
                              onClick={() => { setShowScheduleForm(true); setExpandedId(null); }}
                              className="btn btn-secondary btn-sm"
                            >
                              Schedule Follow-up
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Schedule New Inspection Button */}
      {!showScheduleForm && (
        <button
          onClick={() => setShowScheduleForm(true)}
          className="btn btn-secondary w-full"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Schedule Inspection
        </button>
      )}

      {/* Schedule Form */}
      {showScheduleForm && (
        <div className="bg-surface2 border border-border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium text-text">Schedule New Inspection</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Inspection Type *</label>
              <select
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value as InspectionType)}
                className="select text-sm"
              >
                <option value="">Select type...</option>
                {Object.entries(inspectionTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Date</label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Inspector Name</label>
              <input
                type="text"
                value={scheduleInspector}
                onChange={(e) => setScheduleInspector(e.target.value)}
                className="input text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Contact</label>
              <input
                type="text"
                value={scheduleContact}
                onChange={(e) => setScheduleContact(e.target.value)}
                className="input text-sm"
                placeholder="Phone or email"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Notes</label>
            <textarea
              value={scheduleNotes}
              onChange={(e) => setScheduleNotes(e.target.value)}
              className="input text-sm"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleScheduleSubmit}
              disabled={!scheduleType || isScheduling}
              className="btn btn-primary btn-sm"
            >
              {isScheduling ? 'Scheduling...' : 'Schedule'}
            </button>
            <button
              onClick={() => setShowScheduleForm(false)}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
