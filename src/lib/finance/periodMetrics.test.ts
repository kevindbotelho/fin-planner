import { describe, expect, it } from 'vitest';
import type { BillingPeriod, Expense, MonthlyIncome } from '@/types/finance';
import { derivePeriodMetrics } from './periodMetrics';

const period: BillingPeriod = {
  id: 'period-august',
  name: 'Agosto 2026',
  startDate: '2026-08-01',
  endDate: '2026-08-31',
};

function expense(overrides: Partial<Expense> & Pick<Expense, 'id' | 'amount' | 'purchaseDate'>): Expense {
  return {
    description: overrides.id,
    categoryId: 'category-default',
    subcategoryId: '',
    type: 'variable',
    createdAt: '2026-08-01T12:00:00.000Z',
    displayOrder: 0,
    ...overrides,
  };
}

function income(overrides: Partial<MonthlyIncome> = {}): MonthlyIncome {
  return {
    id: 'income-august',
    billingPeriodId: period.id,
    salary: 4_000,
    extra: 500,
    ...overrides,
  };
}

describe('derivePeriodMetrics', () => {
  it('separates consumption, reserves and ignored entries using integer cents', () => {
    const result = derivePeriodMetrics({
      period,
      income: income(),
      asOfDate: '2026-08-10',
      expenses: [
        expense({
          id: 'past-consumption',
          amount: 100.1,
          purchaseDate: '2026-08-05',
          categoryId: 'food',
          bankOrigin: 'Nubank',
        }),
        expense({
          id: 'future-consumption',
          amount: 200.2,
          purchaseDate: '2026-08-20',
          categoryId: 'leisure',
          bankOrigin: 'Inter',
        }),
        expense({
          id: 'separated-reserve',
          amount: 300,
          purchaseDate: '2026-08-08',
          categoryId: 'investment',
          isReserve: true,
          isFulfilled: true,
          fulfilledAt: '2026-08-09T12:00:00.000Z',
          bankOrigin: 'Nubank',
        }),
        expense({
          id: 'pending-reserve',
          amount: 400,
          purchaseDate: '2026-08-25',
          categoryId: 'investment',
          isReserve: true,
        }),
        expense({
          id: 'ignored-bridge',
          amount: 999,
          purchaseDate: '2026-08-06',
          isIgnored: true,
          bankOrigin: 'Nubank',
        }),
      ],
    });

    expect(result.income).toEqual({
      configured: true,
      salaryCents: 400_000,
      extraCents: 50_000,
      registeredCents: 450_000,
    });
    expect(result.consumption).toEqual({
      knownCents: 30_030,
      launchedThroughAsOfCents: 10_010,
      forecastAfterAsOfCents: 20_020,
      entryCount: 2,
    });
    expect(result.reserves).toEqual({
      plannedCents: 70_000,
      separatedAsOfCents: 30_000,
      pendingAsOfCents: 40_000,
      entryCount: 2,
      separatedEntryCount: 1,
      pendingEntryCount: 1,
    });
    expect(result.balance.freeAfterKnownPlanCents).toBe(349_970);
    expect(result.categories.map(category => category.id)).toEqual(['leisure', 'food']);
    expect(result.banks).toMatchObject([
      { id: 'Nubank', knownCents: 10_010 },
      { id: 'Inter', knownCents: 20_020 },
      { id: 'unassigned', knownCents: 0 },
    ]);
  });

  it('uses inclusive period boundaries and ignores entries outside the period', () => {
    const result = derivePeriodMetrics({
      period,
      asOfDate: '2026-08-15',
      expenses: [
        expense({ id: 'start', amount: 10, purchaseDate: period.startDate }),
        expense({ id: 'end', amount: 20, purchaseDate: period.endDate }),
        expense({ id: 'before', amount: 100, purchaseDate: '2026-07-31' }),
        expense({ id: 'after', amount: 200, purchaseDate: '2026-09-01' }),
      ],
    });

    expect(result.consumption).toEqual({
      knownCents: 3_000,
      launchedThroughAsOfCents: 1_000,
      forecastAfterAsOfCents: 2_000,
      entryCount: 2,
    });
  });

  it('classifies every known entry as forecast before the period starts', () => {
    const result = derivePeriodMetrics({
      period,
      asOfDate: '2026-07-31',
      expenses: [
        expense({ id: 'first', amount: 10, purchaseDate: '2026-08-01' }),
        expense({ id: 'last', amount: 20, purchaseDate: '2026-08-31' }),
      ],
    });

    expect(result.consumption.launchedThroughAsOfCents).toBe(0);
    expect(result.consumption.forecastAfterAsOfCents).toBe(3_000);
  });

  it('classifies every known entry as launched after the period ends', () => {
    const result = derivePeriodMetrics({
      period,
      asOfDate: '2026-09-01',
      expenses: [
        expense({ id: 'first', amount: 10, purchaseDate: '2026-08-01' }),
        expense({ id: 'last', amount: 20, purchaseDate: '2026-08-31' }),
      ],
    });

    expect(result.consumption.launchedThroughAsOfCents).toBe(3_000);
    expect(result.consumption.forecastAfterAsOfCents).toBe(0);
  });

  it('keeps exact cents for decimal additions', () => {
    const result = derivePeriodMetrics({
      period,
      asOfDate: '2026-08-31',
      expenses: [
        expense({ id: 'one', amount: 0.1, purchaseDate: '2026-08-01' }),
        expense({ id: 'two', amount: 0.2, purchaseDate: '2026-08-02' }),
      ],
    });

    expect(result.consumption.knownCents).toBe(30);
  });

  it('distinguishes missing income from an explicitly configured zero income', () => {
    const missing = derivePeriodMetrics({ period, expenses: [], asOfDate: '2026-08-10' });
    const configuredZero = derivePeriodMetrics({
      period,
      expenses: [],
      income: income({ salary: 0, extra: 0 }),
      asOfDate: '2026-08-10',
    });

    expect(missing.income.configured).toBe(false);
    expect(configuredZero.income.configured).toBe(true);
    expect(missing.income.registeredCents).toBe(0);
    expect(configuredZero.income.registeredCents).toBe(0);
  });

  it('evaluates reserve fulfillment relative to asOfDate when fulfilledAt is available', () => {
    const result = derivePeriodMetrics({
      period,
      asOfDate: '2026-08-10',
      expenses: [
        expense({
          id: 'fulfilled-later',
          amount: 500,
          purchaseDate: '2026-08-05',
          isReserve: true,
          isFulfilled: true,
          fulfilledAt: '2026-08-12T03:00:00.000Z',
        }),
      ],
    });

    expect(result.reserves.separatedAsOfCents).toBe(0);
    expect(result.reserves.pendingAsOfCents).toBe(50_000);
  });

  it('keeps a fulfilled reserve without a timestamp separated and reports uncertainty', () => {
    const result = derivePeriodMetrics({
      period,
      asOfDate: '2026-08-10',
      expenses: [
        expense({
          id: 'legacy-reserve',
          amount: 50,
          purchaseDate: '2026-08-05',
          isReserve: true,
          isFulfilled: true,
        }),
      ],
    });

    expect(result.reserves.separatedAsOfCents).toBe(5_000);
    expect(result.qualityIssues).toContainEqual({
      code: 'fulfilled_reserve_without_timestamp',
      severity: 'warning',
      field: 'expense.fulfilledAt',
      entityId: 'legacy-reserve',
    });
  });

  it('skips invalid negative measures and reports data-quality errors', () => {
    const result = derivePeriodMetrics({
      period,
      income: income({ salary: -1, extra: 100 }),
      asOfDate: '2026-08-10',
      expenses: [
        expense({ id: 'negative', amount: -20, purchaseDate: '2026-08-02' }),
        expense({ id: 'valid', amount: 10, purchaseDate: '2026-08-03', isFulfilled: true }),
      ],
    });

    expect(result.income.registeredCents).toBe(10_000);
    expect(result.consumption.knownCents).toBe(1_000);
    expect(result.qualityIssues.map(issue => issue.code)).toEqual([
      'negative_income_amount',
      'negative_expense_amount',
      'fulfilled_non_reserve',
    ]);
  });

  it.each(['2026-02-30', '10/08/2026', ''])('rejects invalid asOfDate %s', asOfDate => {
    expect(() => derivePeriodMetrics({ period, expenses: [], asOfDate })).toThrow(RangeError);
  });
});
