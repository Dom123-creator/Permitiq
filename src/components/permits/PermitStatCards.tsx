'use client';

import { useState, useEffect } from 'react';

interface PermitStats {
  total: number;
  underReview: number;
  overdue: number;
  expiringWithin30: number;
}

interface PermitStatCardsProps {
  refreshKey?: number;
}

export function PermitStatCards({ refreshKey }: PermitStatCardsProps) {
  const [stats, setStats] = useState<PermitStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/permits/stats')
      .then((r) => r.json())
      .then((data) => { if (!data.error) setStats(data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [refreshKey]);

  const cards = [
    {
      label: 'Total Permits',
      value: stats?.total ?? 0,
      sub: 'active and tracked',
      color: 'text-accent',
      border: 'border-t-accent',
    },
    {
      label: 'Under Review',
      value: stats?.underReview ?? 0,
      sub: 'awaiting decision',
      color: 'text-purple',
      border: 'border-t-purple',
    },
    {
      label: 'Overdue',
      value: stats?.overdue ?? 0,
      sub: 'past jurisdiction avg',
      color: 'text-danger',
      border: 'border-t-danger',
    },
    {
      label: 'Expiring Soon',
      value: stats?.expiringWithin30 ?? 0,
      sub: 'within 30 days',
      color: 'text-warn',
      border: 'border-t-warn',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="panel border-t-2 border-t-border animate-pulse">
            <div className="h-8 w-12 bg-surface2 rounded mb-2" />
            <div className="h-3 w-24 bg-surface2 rounded mb-1" />
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
