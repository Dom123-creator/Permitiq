'use client';

import { useState, useEffect } from 'react';

interface InspectionStats {
  totalScheduled: number;
  thisWeek: number;
  passed: number;
  failedOrPartial: number;
}

export function InspectionStatCards() {
  const [stats, setStats] = useState<InspectionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/inspections/stats')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setStats(data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const cards = [
    {
      label: 'Scheduled',
      value: stats?.totalScheduled ?? 0,
      sub: 'awaiting inspection',
      color: 'text-accent',
      border: 'border-t-accent',
    },
    {
      label: 'This Week',
      value: stats?.thisWeek ?? 0,
      sub: 'in next 7 days',
      color: 'text-warn',
      border: 'border-t-warn',
    },
    {
      label: 'Passed',
      value: stats?.passed ?? 0,
      sub: 'inspections cleared',
      color: 'text-success',
      border: 'border-t-success',
    },
    {
      label: 'Need Attention',
      value: stats?.failedOrPartial ?? 0,
      sub: 'failed or partial',
      color: 'text-danger',
      border: 'border-t-danger',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="panel border-t-2 border-t-border animate-pulse">
            <div className="h-8 w-12 bg-surface2 rounded mb-2" />
            <div className="h-3 w-20 bg-surface2 rounded opacity-60" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.label} className={`panel border-t-2 ${card.border}`}>
          <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
          <div className="text-sm font-medium text-text mt-1">{card.label}</div>
          <div className="text-xs text-muted">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}
