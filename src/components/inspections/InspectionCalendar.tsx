'use client';

import { useState, useMemo, useEffect } from 'react';
import { Inspection, InspectionResult, inspectionTypeLabels, resultConfig } from './InspectionTypes';

interface CalendarInspection extends Inspection {
  permitName: string | null;
  projectName: string | null;
}

type ViewMode = 'list' | 'week';

export function InspectionCalendar() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [inspections, setInspections] = useState<CalendarInspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/inspections?upcoming=true')
      .then((r) => r.json())
      .then((data) => {
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
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const scheduledInspections = inspections.filter(
    (i) => i.scheduledDate && (!i.result || i.result === 'scheduled')
  );

  const formatFullDate = (date: Date): string =>
    new Intl.DateTimeFormat('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    }).format(date);

  const getDaysUntil = (date: Date): number => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
  };

  const getRelativeDay = (date: Date): string => {
    const days = getDaysUntil(date);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `In ${days} days`;
    if (days < 14) return 'Next week';
    return `In ${Math.ceil(days / 7)} weeks`;
  };

  const groupedInspections = useMemo(() => {
    const groups: Record<string, CalendarInspection[]> = {};
    scheduledInspections
      .sort((a, b) => a.scheduledDate!.getTime() - b.scheduledDate!.getTime())
      .forEach((i) => {
        const key = i.scheduledDate!.toISOString().split('T')[0];
        if (!groups[key]) groups[key] = [];
        groups[key].push(i);
      });
    return groups;
  }, [scheduledInspections]);

  const weekDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="text-lg font-semibold text-text">Upcoming Inspections</h2>
          <p className="text-sm text-muted">
            {isLoading ? '…' : `${scheduledInspections.length} inspection${scheduledInspections.length !== 1 ? 's' : ''} scheduled`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`btn btn-sm ${viewMode === 'week' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-surface2 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-surface2 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-surface2 rounded animate-pulse opacity-60" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && viewMode === 'list' && (
        <div className="divide-y divide-border">
          {Object.entries(groupedInspections).map(([dateKey, dayInspections]) => {
            const date = new Date(dateKey + 'T12:00:00');
            const daysUntil = getDaysUntil(date);
            const isToday = daysUntil === 0;
            const isTomorrow = daysUntil === 1;

            return (
              <div key={dateKey} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                    isToday ? 'bg-accent text-bg'
                    : isTomorrow ? 'bg-warn/20 text-warn'
                    : 'bg-surface2 text-text'
                  }`}>
                    <span className="text-xs uppercase">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-lg font-bold leading-tight">{date.getDate()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">{formatFullDate(date)}</p>
                    <p className={`text-xs ${isToday ? 'text-accent' : 'text-muted'}`}>
                      {getRelativeDay(date)} • {dayInspections.length} inspection{dayInspections.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pl-15">
                  {dayInspections.map((inspection) => {
                    const typeLabel =
                      inspectionTypeLabels[inspection.type as keyof typeof inspectionTypeLabels]
                      ?? inspection.type;
                    const result: InspectionResult = inspection.result ?? 'scheduled';
                    const config = resultConfig[result] ?? resultConfig['scheduled'];

                    return (
                      <div
                        key={inspection.id}
                        className="flex items-center gap-3 p-3 bg-surface2 border border-border rounded-lg hover:border-muted transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-accent text-sm font-bold">
                            {typeLabel.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text">{typeLabel}</p>
                          <p className="text-xs text-muted truncate">
                            {inspection.permitName ?? 'Unknown permit'}
                            {inspection.projectName ? ` • ${inspection.projectName}` : ''}
                          </p>
                        </div>
                        {inspection.inspectorName && (
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-text">{inspection.inspectorName}</p>
                            {inspection.inspectorContact && (
                              <p className="text-xs text-accent">{inspection.inspectorContact}</p>
                            )}
                          </div>
                        )}
                        <span className={`badge flex-shrink-0 ${config.class}`}>
                          {config.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {Object.keys(groupedInspections).length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-muted">No upcoming inspections scheduled</p>
            </div>
          )}
        </div>
      )}

      {!isLoading && viewMode === 'week' && (
        <div className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dateKey = day.toISOString().split('T')[0];
              const dayInspections = groupedInspections[dateKey] ?? [];
              const isToday = getDaysUntil(day) === 0;

              return (
                <div
                  key={dateKey}
                  className={`min-h-[120px] p-2 rounded-lg border ${
                    isToday ? 'border-accent bg-accent/5' : 'border-border bg-surface2'
                  }`}
                >
                  <div className={`text-xs font-medium mb-2 ${isToday ? 'text-accent' : 'text-muted'}`}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    <span className={`ml-1 ${isToday ? 'text-accent' : 'text-text'}`}>
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayInspections.map((inspection) => {
                      const typeLabel =
                        inspectionTypeLabels[inspection.type as keyof typeof inspectionTypeLabels]
                        ?? inspection.type;
                      return (
                        <div
                          key={inspection.id}
                          className="p-1.5 bg-card rounded text-xs truncate cursor-pointer hover:bg-border/50"
                          title={`${typeLabel} — ${inspection.projectName ?? ''}`}
                        >
                          <span className="text-accent mr-1">•</span>
                          <span className="text-text">{typeLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
