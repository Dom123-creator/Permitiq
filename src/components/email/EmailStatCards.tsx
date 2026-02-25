'use client';

import { useState, useEffect } from 'react';

interface EmailStats {
  total: number;
  pending: number;
  sent: number;
  rejected: number;
}

interface EmailStatCardsProps {
  refreshKey?: number;
}

export function EmailStatCards({ refreshKey }: EmailStatCardsProps) {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/emails/stats')
      .then((r) => r.json())
      .then((data) => { if (!data.error) setStats(data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [refreshKey]);

  const cards = [
    {
      label: 'Total Drafts',
      value: stats?.total ?? 0,
      sub: 'all time',
      color: 'text-accent',
      border: 'border-t-accent',
    },
    {
      label: 'Pending Review',
      value: stats?.pending ?? 0,
      sub: 'awaiting approval',
      color: 'text-warn',
      border: 'border-t-warn',
    },
    {
      label: 'Sent',
      value: stats?.sent ?? 0,
      sub: 'approved and sent',
      color: 'text-success',
      border: 'border-t-success',
    },
    {
      label: 'Rejected',
      value: stats?.rejected ?? 0,
      sub: 'declined',
      color: 'text-danger',
      border: 'border-t-danger',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="panel border-t-2 border-t-border animate-pulse">
            <div className="h-8 w-10 bg-surface2 rounded mb-2" />
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
