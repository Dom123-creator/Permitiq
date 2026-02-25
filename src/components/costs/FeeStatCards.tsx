'use client';

import { useState, useEffect } from 'react';

interface FeeStats {
  totalCharged: number;
  totalPaid: number;
  totalUnpaid: number;
  feeCount: number;
  unpaidCount: number;
  totalBudgeted: number;
}

export function FeeStatCards() {
  const [stats, setStats] = useState<FeeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/fees/stats')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.totalCharged === 'number') setStats(data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="stat-card animate-pulse">
            <div className="h-4 bg-surface2 rounded w-1/2 mb-3" />
            <div className="h-7 bg-surface2 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats || stats.feeCount === 0) return null;

  const variance = stats.totalCharged - stats.totalBudgeted;
  const overBudget = stats.totalBudgeted > 0 && variance > 0;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {/* Total Charged */}
      <div className="stat-card" style={{ borderTopColor: 'var(--accent)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted uppercase tracking-wide">Permit Fees Charged</span>
          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-2xl font-bold text-text">{formatCurrency(stats.totalCharged)}</div>
        {stats.totalBudgeted > 0 && (
          <div className={`text-xs mt-1 ${overBudget ? 'text-danger' : 'text-success'}`}>
            {overBudget ? '+' : ''}{formatCurrency(variance)} vs budget
          </div>
        )}
        <div className="text-xs text-muted mt-1">{stats.feeCount} fee entries</div>
      </div>

      {/* Paid */}
      <div className="stat-card" style={{ borderTopColor: 'var(--success)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted uppercase tracking-wide">Paid</span>
          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-2xl font-bold text-success">{formatCurrency(stats.totalPaid)}</div>
        {stats.totalCharged > 0 && (
          <div className="text-xs text-muted mt-1">
            {Math.round((stats.totalPaid / stats.totalCharged) * 100)}% of total
          </div>
        )}
      </div>

      {/* Unpaid */}
      <div className="stat-card" style={{ borderTopColor: stats.totalUnpaid > 0 ? 'var(--warn)' : 'var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted uppercase tracking-wide">Outstanding</span>
          <svg className={`w-4 h-4 ${stats.totalUnpaid > 0 ? 'text-warn' : 'text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className={`text-2xl font-bold ${stats.totalUnpaid > 0 ? 'text-warn' : 'text-muted'}`}>
          {formatCurrency(stats.totalUnpaid)}
        </div>
        {stats.unpaidCount > 0 && (
          <div className="text-xs text-warn mt-1">{stats.unpaidCount} unpaid entries</div>
        )}
      </div>
    </div>
  );
}
