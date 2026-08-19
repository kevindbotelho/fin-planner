import { describe, expect, it } from 'vitest';
import type { BillingPeriod, Category, Expense } from '@/types/finance';
import {
  buildDashboardInsights,
  calculateDashboardInsightMetrics,
} from './dashboard.insights';

const period: BillingPeriod = {
  id: 'august',
  name: 'Agosto',
  startDate: '2026-08-01',
  endDate: '2026-08-31',
};

const previousPeriod: BillingPeriod = {
  id: 'july',
  name: 'Julho',
  startDate: '2026-07-01',
  endDate: '2026-07-31',
};

const categories: Category[] = [
  {
    id: 'food',
    name: 'Alimentação',
    color: '#f00',
    subcategories: [],
  },
  {
    id: 'leisure',
    name: 'Lazer',
    color: '#0f0',
    subcategories: [],
  },
];

const expense = (overrides: Partial<Expense> & Pick<Expense, 'id'>): Expense => ({
  id: overrides.id,
  description: 'Lançamento',
  amount: 100,
  purchaseDate: '2026-08-05',
  categoryId: 'food',
  subcategoryId: '',
  type: 'variable',
  createdAt: '2026-08-05T12:00:00Z',
  displayOrder: 0,
  ...overrides,
});

describe('calculateDashboardInsightMetrics', () => {
  it('separa consumo, reserva, lançamentos futuros e ignorados', () => {
    const metrics = calculateDashboardInsightMetrics(
      period,
      [
        expense({ id: 'consumption-past', amount: 100 }),
        expense({ id: 'consumption-future', amount: 50, purchaseDate: '2026-08-20' }),
        expense({ id: 'reserve', amount: 200, isReserve: true }),
        expense({ id: 'ignored', amount: 999, isIgnored: true }),
        expense({ id: 'outside', amount: 300, purchaseDate: '2026-09-01' }),
      ],
      500,
      '2026-08-10',
    );

    expect(metrics.consumption).toMatchObject({
      launchedThroughToday: 100,
      forecastAfterToday: 50,
      total: 150,
    });
    expect(metrics.reserves.total).toBe(200);
    expect(metrics.projectedFreeBalance).toBe(150);
    expect(metrics.consumption.launchedExpenseIds).toEqual(['consumption-past']);
  });

  it('descarta valores inválidos e os expõe como diagnóstico', () => {
    const metrics = calculateDashboardInsightMetrics(
      period,
      [
        expense({ id: 'negative', amount: -1 }),
        expense({ id: 'nan', amount: Number.NaN }),
        expense({ id: 'invalid-date', purchaseDate: '2026-02-31' }),
      ],
      0,
      '2026-08-10',
    );

    expect(metrics.consumption.total).toBe(0);
    expect(metrics.invalidExpenseIds).toEqual(['negative', 'nan', 'invalid-date']);
  });
});

describe('buildDashboardInsights', () => {
  it('compara somente o mesmo número de dias do período anterior', () => {
    const insights = buildDashboardInsights({
      period,
      today: '2026-08-10',
      income: 1_000,
      categories,
      expenses: [
        expense({ id: 'current-through-today', amount: 100 }),
        expense({ id: 'current-future', amount: 500, purchaseDate: '2026-08-20' }),
      ],
      previousPeriod: {
        period: previousPeriod,
        expenses: [
          expense({ id: 'previous-comparable', amount: 40, purchaseDate: '2026-07-05' }),
          expense({ id: 'previous-after-cutoff', amount: 600, purchaseDate: '2026-07-20' }),
        ],
      },
    });

    const categoryInsight = insights.find((item) => item.kind === 'category_change');
    expect(categoryInsight?.description).toContain('lançado até hoje');
    expect(categoryInsight?.evidence).toMatchObject({
      currentValue: 100,
      baselineValue: 40,
      absoluteChange: 60,
      baselinePeriodId: 'july',
      expenseIds: ['current-through-today'],
    });
  });

  it('explica saldo projetado negativo com evidência rastreável', () => {
    const insights = buildDashboardInsights({
      period,
      today: '2026-08-10',
      income: 100,
      categories,
      expenses: [
        expense({ id: 'past', amount: 80 }),
        expense({ id: 'future', amount: 50, purchaseDate: '2026-08-20' }),
      ],
    });

    const balance = insights.find((item) => item.kind === 'projected_free_balance');
    expect(balance?.priority).toBe('high');
    expect(balance?.description).toContain('lançado até hoje e previsto após hoje');
    expect(balance?.evidence.currentValue).toBe(-30);
    expect(balance?.evidence.expenseIds).toEqual(['past', 'future']);
  });

  it('separa reserva pendente entre lançado e previsto', () => {
    const insights = buildDashboardInsights({
      period,
      today: '2026-08-10',
      income: 1_000,
      categories,
      expenses: [
        expense({ id: 'reserve-past', amount: 100, isReserve: true, isFulfilled: false }),
        expense({
          id: 'reserve-future',
          amount: 200,
          purchaseDate: '2026-08-21',
          isReserve: true,
          isFulfilled: false,
        }),
      ],
    });

    const reserve = insights.find((item) => item.kind === 'reserve_pending');
    expect(reserve?.description).toContain('R$ 100,00 lançado até hoje');
    expect(reserve?.description).toContain('R$ 200,00 previsto após hoje');
    expect(reserve?.evidence.expenseIds).toEqual(['reserve-past', 'reserve-future']);
  });

  it('sinaliza meta com lançamentos de todo o período e sempre inclui ação', () => {
    const insights = buildDashboardInsights({
      period,
      today: '2026-08-10',
      income: 1_000,
      categories,
      expenses: [
        expense({ id: 'past', amount: 70 }),
        expense({ id: 'future', amount: 40, purchaseDate: '2026-08-20' }),
      ],
      goals: [{ id: 'goal-food', categoryId: 'food', amount: 100 }],
    });

    const goal = insights.find((item) => item.kind === 'goal_risk');
    expect(goal?.priority).toBe('high');
    expect(goal?.evidence.expenseIds).toEqual(['past', 'future']);
    expect(goal?.action).toEqual({
      kind: 'review_goal',
      label: 'Revisar meta de Alimentação',
      categoryId: 'food',
    });
  });

  it('limita e ordena os sinais por prioridade de modo determinístico', () => {
    const input = {
      period,
      today: '2026-08-10',
      income: 100,
      categories,
      maxInsights: 1,
      expenses: [
        expense({ id: 'expense', amount: 200 }),
        expense({ id: 'reserve', amount: 10, isReserve: true, isFulfilled: false }),
      ],
    };

    expect(buildDashboardInsights(input)).toEqual(buildDashboardInsights(input));
    expect(buildDashboardInsights(input)).toHaveLength(1);
    expect(buildDashboardInsights(input)[0].kind).toBe('projected_free_balance');
  });
});
