import type { DashboardComparisonTone, FinancialGoalStatus } from '@/features/dashboard-v2/dashboard.types';

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

export const comparisonToneClasses: Record<DashboardComparisonTone, string> = {
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-rose-500 dark:text-rose-400',
  neutral: 'text-slate-400 dark:text-slate-500',
};

export const goalStatusClasses: Record<FinancialGoalStatus, string> = {
  'on-track': 'bg-emerald-500 dark:bg-emerald-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  over: 'bg-rose-500 dark:bg-rose-400',
};

export const goalStatusTextClasses: Record<FinancialGoalStatus, string> = {
  'on-track': 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  over: 'text-rose-500 dark:text-rose-400',
};
