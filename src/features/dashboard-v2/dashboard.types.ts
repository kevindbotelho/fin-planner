export type DashboardMetricKey = 'income' | 'consumption' | 'reserved' | 'freeBalance';

export type DashboardComparisonTone = 'positive' | 'negative' | 'neutral';

export interface DashboardMetricComparison {
  referenceLabel: string;
  deltaPercentage: number;
  tone?: DashboardComparisonTone;
}

export interface DashboardSummary {
  income: number;
  consumption: number;
  reserved: number;
  freeBalance: number;
  comparisons?: Partial<Record<DashboardMetricKey, DashboardMetricComparison>>;
}

export type FinancialGoalStatus = 'on-track' | 'warning' | 'over';

export interface FinancialGoalItem {
  id: string;
  label: string;
  spent: number;
  limit: number;
  percentage: number;
  status: FinancialGoalStatus;
  scopeLabel?: string;
}

export interface PeriodReserveItem {
  id: string;
  label: string;
  planned: number;
  separated: number;
  categoryLabel?: string;
}

export interface PeriodReservesSummary {
  planned: number;
  separated: number;
  pending: number;
}

export type BankSpendingKind = 'bank' | 'card' | 'other';
export type BankSpendingTone = 'purple' | 'orange' | 'blue' | 'emerald' | 'slate';

export interface BankSpendingItem {
  id: string;
  name: string;
  amount: number;
  percentage?: number;
  kind?: BankSpendingKind;
  tone?: BankSpendingTone;
}
