import { describe, expect, it } from 'vitest';
import { buildCategoryAnalysis, buildDailyConsumptionSeries } from './dashboard.selectors';
import type { BillingPeriod, Category, Expense } from '@/types/finance';

const period: BillingPeriod = {
  id: 'period-current',
  name: 'Agosto 2026',
  startDate: '2026-07-31',
  endDate: '2026-08-30',
};

const categories: Category[] = [{
  id: 'food',
  name: 'Alimentação',
  color: '#10b981',
  subcategories: [{ id: 'restaurant', name: 'Restaurantes', categoryId: 'food' }],
}];

const expense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'expense-1',
  description: 'Restaurante',
  amount: 125.5,
  purchaseDate: '2026-08-05',
  categoryId: 'food',
  subcategoryId: 'restaurant',
  type: 'variable',
  createdAt: '2026-08-05T12:00:00Z',
  displayOrder: 0,
  ...overrides,
});

describe('buildCategoryAnalysis', () => {
  it('keeps consumption separate from reserves and ignored entries', () => {
    const result = buildCategoryAnalysis([
      expense(),
      expense({ id: 'reserve', amount: 500, isReserve: true }),
      expense({ id: 'ignored', amount: 300, isIgnored: true }),
    ], [expense({ id: 'previous', amount: 100 })], categories);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'food',
      currentCents: 12_550,
      previousCents: 10_000,
      shareOfConsumptionBps: 10_000,
      fixedCents: 0,
      variableCents: 12_550,
    });
    expect(result[0].changePercent).toBeCloseTo(25.5);
  });
});

describe('buildDailyConsumptionSeries', () => {
  it('labels known entries before and after the reference date without calling them paid', () => {
    const result = buildDailyConsumptionSeries(period, [
      expense({ id: 'past', purchaseDate: '2026-08-05', amount: 10 }),
      expense({ id: 'future', purchaseDate: '2026-08-12', amount: 20 }),
    ], '2026-08-10');

    expect(result.find(point => point.date === '2026-08-05')).toMatchObject({
      launchedCents: 1_000,
      forecastCents: 0,
    });
    expect(result.find(point => point.date === '2026-08-12')).toMatchObject({
      launchedCents: 0,
      forecastCents: 2_000,
    });
  });
});
