'use client';

import { useState, useEffect } from 'react';

interface AuditStats {
  total: number;
  userCount: number;
  agentCount: number;
  today: number;
}

export function AuditStatCards() {
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audit/stats')
      .then((r) => r.json())
      .then((data) => { if (!data.error) setStats(data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const cards = [
    {
      label: 'Total Entries',
      value: stats?.total ?? 0,
      sub: 'all time',
      color: 'text-accent',
      border: 'border-t-accent',
    },
    {
      label: "Today's Activity",
      value: stats?.today ?? 0,
      sub: 'entries since midnight',
      color: 'text-success',
      border: 'border-t-success',
    },
    {
      label: 'User Actions',
      value: stats?.userCount ?? 0,
      sub: 'manual changes',
      color: 'text-text',
      border: 'border-t-border',
    },
    {
      label: 'Agent Actions',
      value: stats?.agentCount ?? 0,
      sub: 'automated by agent',
      color: 'text-purple',
      border: 'border-t-purple',
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
