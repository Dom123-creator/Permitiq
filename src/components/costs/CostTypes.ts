export interface ProjectCosts {
  id: string;
  projectId: string;
  dailyCarryingCost: number; // Daily cost when project is delayed
  schedulePenalty: number; // Contract penalty for delays
  budgetedPermitFees: number;
  actualPermitFees: number;
}

export interface PermitCostImpact {
  permitId: string;
  permitName: string;
  projectName: string;
  daysOverdue: number;
  dailyCarryingCost: number;
  totalDelayCost: number;
  schedulePenaltyRisk: number;
  status: 'on-track' | 'at-risk' | 'critical';
}

export interface PortfolioCostSummary {
  totalDelayCost: number;
  totalSchedulePenaltyRisk: number;
  permitsAtRisk: number;
  permitsCritical: number;
  avgDaysOverdue: number;
  projectedMonthlyCost: number;
}

export function calculateDelayCost(daysOverdue: number, dailyCarryingCost: number): number {
  if (daysOverdue <= 0) return 0;
  return daysOverdue * dailyCarryingCost;
}

export function calculateSchedulePenaltyRisk(
  daysOverdue: number,
  schedulePenalty: number,
  penaltyThresholdDays: number = 30
): number {
  if (daysOverdue <= 0) return 0;
  // Risk increases as we approach penalty threshold
  const riskFactor = Math.min(daysOverdue / penaltyThresholdDays, 1);
  return schedulePenalty * riskFactor;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return formatCurrency(amount);
}

export function getCostStatus(daysOverdue: number): 'on-track' | 'at-risk' | 'critical' {
  if (daysOverdue <= 0) return 'on-track';
  if (daysOverdue <= 10) return 'at-risk';
  return 'critical';
}

export const costStatusConfig = {
  'on-track': { label: 'On Track', class: 'badge-success', color: 'text-success' },
  'at-risk': { label: 'At Risk', class: 'badge-warn', color: 'text-warn' },
  'critical': { label: 'Critical', class: 'badge-danger', color: 'text-danger' },
};
