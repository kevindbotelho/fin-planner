import type { BillingPeriod, Expense, MonthlyIncome } from '@/types/finance';
import { toCents, type MoneyCents } from './money';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type MetricQualitySeverity = 'warning' | 'error';

export type MetricQualityIssueCode =
  | 'invalid_expense_amount'
  | 'negative_expense_amount'
  | 'invalid_income_amount'
  | 'negative_income_amount'
  | 'fulfilled_non_reserve'
  | 'fulfilled_reserve_without_timestamp'
  | 'invalid_fulfilled_at';

export interface MetricQualityIssue {
  code: MetricQualityIssueCode;
  severity: MetricQualitySeverity;
  field: string;
  entityId?: string;
}

export interface ConsumptionMetric {
  knownCents: MoneyCents;
  launchedThroughAsOfCents: MoneyCents;
  forecastAfterAsOfCents: MoneyCents;
  entryCount: number;
}

export interface ReserveMetric {
  plannedCents: MoneyCents;
  separatedAsOfCents: MoneyCents;
  pendingAsOfCents: MoneyCents;
  entryCount: number;
  separatedEntryCount: number;
  pendingEntryCount: number;
}

export interface ConsumptionDimensionMetric extends ConsumptionMetric {
  id: string;
  shareOfKnownBps: number;
}

export type BankMetricId = 'Nubank' | 'Inter' | 'unassigned';

export interface BankConsumptionMetric extends ConsumptionMetric {
  id: BankMetricId;
  shareOfKnownBps: number;
}

export interface PeriodMetrics {
  periodId: string;
  asOfDate: string;
  currency: 'BRL';
  income: {
    configured: boolean;
    salaryCents: MoneyCents;
    extraCents: MoneyCents;
    registeredCents: MoneyCents;
  };
  consumption: ConsumptionMetric;
  reserves: ReserveMetric;
  balance: {
    freeAfterKnownPlanCents: MoneyCents;
  };
  categories: ConsumptionDimensionMetric[];
  banks: BankConsumptionMetric[];
  qualityIssues: MetricQualityIssue[];
}

export interface DerivePeriodMetricsInput {
  period: BillingPeriod;
  expenses: readonly Expense[];
  income?: MonthlyIncome;
  asOfDate: string;
}

interface MutableConsumptionMetric {
  knownCents: number;
  launchedThroughAsOfCents: number;
  forecastAfterAsOfCents: number;
  entryCount: number;
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function assertMetricDates(period: BillingPeriod, asOfDate: string): void {
  if (!isValidIsoDate(period.startDate) || !isValidIsoDate(period.endDate)) {
    throw new RangeError('Billing period dates must use valid yyyy-MM-dd values.');
  }

  if (period.startDate > period.endDate) {
    throw new RangeError('Billing period start date cannot be after its end date.');
  }

  if (!isValidIsoDate(asOfDate)) {
    throw new RangeError('asOfDate must be a valid yyyy-MM-dd value.');
  }
}

function readNonNegativeCents(
  value: number,
  field: string,
  issues: MetricQualityIssue[],
  entityId?: string,
): MoneyCents | null {
  if (!Number.isFinite(value)) {
    issues.push({
      code: field.startsWith('income.') ? 'invalid_income_amount' : 'invalid_expense_amount',
      severity: 'error',
      field,
      entityId,
    });
    return null;
  }

  if (value < 0) {
    issues.push({
      code: field.startsWith('income.') ? 'negative_income_amount' : 'negative_expense_amount',
      severity: 'error',
      field,
      entityId,
    });
    return null;
  }

  return toCents(value);
}

function createMutableConsumptionMetric(): MutableConsumptionMetric {
  return {
    knownCents: 0,
    launchedThroughAsOfCents: 0,
    forecastAfterAsOfCents: 0,
    entryCount: 0,
  };
}

function addConsumption(
  metric: MutableConsumptionMetric,
  amountCents: MoneyCents,
  purchaseDate: string,
  asOfDate: string,
): void {
  metric.knownCents += amountCents;
  metric.entryCount += 1;

  if (purchaseDate <= asOfDate) {
    metric.launchedThroughAsOfCents += amountCents;
  } else {
    metric.forecastAfterAsOfCents += amountCents;
  }
}

function shareInBasisPoints(valueCents: MoneyCents, totalCents: MoneyCents): number {
  if (totalCents <= 0) return 0;
  return Math.round((valueCents * 10_000) / totalCents);
}

function fulfilledDateFromTimestamp(value: string): string | null {
  const datePart = value.slice(0, 10);
  return isValidIsoDate(datePart) ? datePart : null;
}

function isReserveSeparatedAsOf(
  expense: Expense,
  asOfDate: string,
  issues: MetricQualityIssue[],
): boolean {
  if (!expense.isFulfilled) return false;

  if (!expense.fulfilledAt) {
    issues.push({
      code: 'fulfilled_reserve_without_timestamp',
      severity: 'warning',
      field: 'expense.fulfilledAt',
      entityId: expense.id,
    });
    return true;
  }

  const fulfilledDate = fulfilledDateFromTimestamp(expense.fulfilledAt);
  if (!fulfilledDate) {
    issues.push({
      code: 'invalid_fulfilled_at',
      severity: 'warning',
      field: 'expense.fulfilledAt',
      entityId: expense.id,
    });
    return true;
  }

  return fulfilledDate <= asOfDate;
}

export function derivePeriodMetrics({
  period,
  expenses,
  income,
  asOfDate,
}: DerivePeriodMetricsInput): PeriodMetrics {
  assertMetricDates(period, asOfDate);

  const qualityIssues: MetricQualityIssue[] = [];
  const salaryCents = income
    ? readNonNegativeCents(income.salary, 'income.salary', qualityIssues) ?? 0
    : 0;
  const extraCents = income
    ? readNonNegativeCents(income.extra, 'income.extra', qualityIssues) ?? 0
    : 0;

  const consumption = createMutableConsumptionMetric();
  const categories = new Map<string, MutableConsumptionMetric>();
  const banks = new Map<BankMetricId, MutableConsumptionMetric>([
    ['Nubank', createMutableConsumptionMetric()],
    ['Inter', createMutableConsumptionMetric()],
    ['unassigned', createMutableConsumptionMetric()],
  ]);

  let reservePlannedCents = 0;
  let reserveSeparatedCents = 0;
  let reserveEntryCount = 0;
  let separatedReserveEntryCount = 0;

  for (const expense of expenses) {
    if (expense.isIgnored) continue;
    if (expense.purchaseDate < period.startDate || expense.purchaseDate > period.endDate) continue;

    const amountCents = readNonNegativeCents(
      expense.amount,
      'expense.amount',
      qualityIssues,
      expense.id,
    );
    if (amountCents === null) continue;

    if (!expense.isReserve && expense.isFulfilled) {
      qualityIssues.push({
        code: 'fulfilled_non_reserve',
        severity: 'warning',
        field: 'expense.isFulfilled',
        entityId: expense.id,
      });
    }

    if (expense.isReserve) {
      reservePlannedCents += amountCents;
      reserveEntryCount += 1;

      if (isReserveSeparatedAsOf(expense, asOfDate, qualityIssues)) {
        reserveSeparatedCents += amountCents;
        separatedReserveEntryCount += 1;
      }
      continue;
    }

    addConsumption(consumption, amountCents, expense.purchaseDate, asOfDate);

    const categoryMetric = categories.get(expense.categoryId) ?? createMutableConsumptionMetric();
    addConsumption(categoryMetric, amountCents, expense.purchaseDate, asOfDate);
    categories.set(expense.categoryId, categoryMetric);

    const bankId: BankMetricId = expense.bankOrigin === 'Nubank' || expense.bankOrigin === 'Inter'
      ? expense.bankOrigin
      : 'unassigned';
    addConsumption(banks.get(bankId)!, amountCents, expense.purchaseDate, asOfDate);
  }

  const categoryMetrics: ConsumptionDimensionMetric[] = [...categories.entries()]
    .map(([id, metric]) => ({
      id,
      ...metric,
      shareOfKnownBps: shareInBasisPoints(metric.knownCents, consumption.knownCents),
    }))
    .sort((a, b) => b.knownCents - a.knownCents || a.id.localeCompare(b.id));

  const bankMetrics: BankConsumptionMetric[] = (['Nubank', 'Inter', 'unassigned'] as const)
    .map(id => {
      const metric = banks.get(id)!;
      return {
        id,
        ...metric,
        shareOfKnownBps: shareInBasisPoints(metric.knownCents, consumption.knownCents),
      };
    });

  const registeredIncomeCents = salaryCents + extraCents;
  const reservePendingCents = reservePlannedCents - reserveSeparatedCents;

  return {
    periodId: period.id,
    asOfDate,
    currency: 'BRL',
    income: {
      configured: income !== undefined,
      salaryCents,
      extraCents,
      registeredCents: registeredIncomeCents,
    },
    consumption: { ...consumption },
    reserves: {
      plannedCents: reservePlannedCents,
      separatedAsOfCents: reserveSeparatedCents,
      pendingAsOfCents: reservePendingCents,
      entryCount: reserveEntryCount,
      separatedEntryCount: separatedReserveEntryCount,
      pendingEntryCount: reserveEntryCount - separatedReserveEntryCount,
    },
    balance: {
      freeAfterKnownPlanCents:
        registeredIncomeCents - consumption.knownCents - reservePlannedCents,
    },
    categories: categoryMetrics,
    banks: bankMetrics,
    qualityIssues,
  };
}
