import type {
  BillingPeriod,
  Category,
  CategoryGoal,
  Expense,
} from '@/types/finance';

export type InsightPriority = 'high' | 'medium' | 'low';

export type InsightKind =
  | 'category_change'
  | 'goal_risk'
  | 'reserve_pending'
  | 'projected_free_balance';

export type InsightScope =
  | 'lancado_ate_hoje'
  | 'previsto_apos_hoje'
  | 'periodo_completo';

export interface InsightEvidence {
  metric: string;
  periodId: string;
  scope: InsightScope;
  currentValue: number;
  expenseIds: string[];
  baselineValue?: number;
  baselinePeriodId?: string;
  absoluteChange?: number;
  percentageChange?: number;
  categoryId?: string;
  goalValue?: number;
}

export type InsightAction =
  | {
      kind: 'filter_expenses';
      label: string;
      categoryId?: string;
      dateScope?: 'through_today' | 'after_today';
    }
  | {
      kind: 'review_reserves';
      label: string;
    }
  | {
      kind: 'review_goal';
      label: string;
      categoryId: string;
    };

export interface DashboardInsight {
  id: string;
  kind: InsightKind;
  priority: InsightPriority;
  title: string;
  description: string;
  evidence: InsightEvidence;
  action: InsightAction;
}

export interface DashboardMetricSlice {
  launchedThroughToday: number;
  forecastAfterToday: number;
  total: number;
  launchedExpenseIds: string[];
  forecastExpenseIds: string[];
}

export interface DashboardInsightMetrics {
  consumption: DashboardMetricSlice;
  reserves: DashboardMetricSlice;
  projectedFreeBalance: number;
  invalidExpenseIds: string[];
}

export interface ComparablePeriodInput {
  period: BillingPeriod;
  expenses: Expense[];
}

export interface BuildDashboardInsightsInput {
  period: BillingPeriod;
  expenses: Expense[];
  categories: Category[];
  income: number;
  today: string;
  previousPeriod?: ComparablePeriodInput;
  goals?: CategoryGoal[];
  maxInsights?: number;
}

const DAY_MS = 24 * 60 * 60 * 1_000;

const priorityWeight: Record<InsightPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseIsoDay = (value: string) => {
  if (!isIsoDate(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp;
};

const formatIsoDay = (timestamp: number) =>
  new Date(timestamp).toISOString().slice(0, 10);

const isExpenseInsidePeriod = (expense: Expense, period: BillingPeriod) =>
  expense.purchaseDate >= period.startDate && expense.purchaseDate <= period.endDate;

const isValidExpense = (expense: Expense) =>
  Number.isFinite(expense.amount) &&
  expense.amount >= 0 &&
  parseIsoDay(expense.purchaseDate) !== null;

const sumExpenses = (expenses: Expense[]) =>
  roundMoney(expenses.reduce((total, expense) => total + expense.amount, 0));

const toMetricSlice = (expenses: Expense[], today: string): DashboardMetricSlice => {
  const launched = expenses.filter((expense) => expense.purchaseDate <= today);
  const forecast = expenses.filter((expense) => expense.purchaseDate > today);

  return {
    launchedThroughToday: sumExpenses(launched),
    forecastAfterToday: sumExpenses(forecast),
    total: sumExpenses(expenses),
    launchedExpenseIds: launched.map((expense) => expense.id),
    forecastExpenseIds: forecast.map((expense) => expense.id),
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const periodDayCountThrough = (period: BillingPeriod, today: string) => {
  const start = parseIsoDay(period.startDate);
  const end = parseIsoDay(period.endDate);
  const reference = parseIsoDay(today);

  if (start === null || end === null || reference === null || end < start || reference < start) {
    return 0;
  }

  const effectiveEnd = Math.min(reference, end);
  return Math.floor((effectiveEnd - start) / DAY_MS) + 1;
};

const comparableCutoff = (period: BillingPeriod, numberOfDays: number) => {
  const start = parseIsoDay(period.startDate);
  const end = parseIsoDay(period.endDate);
  if (start === null || end === null || end < start || numberOfDays <= 0) return null;

  const desired = start + (numberOfDays - 1) * DAY_MS;
  return formatIsoDay(Math.min(desired, end));
};

const categoryTotals = (expenses: Expense[]) => {
  const totals = new Map<string, { amount: number; expenseIds: string[] }>();

  for (const expense of expenses) {
    const current = totals.get(expense.categoryId) ?? { amount: 0, expenseIds: [] };
    current.amount = roundMoney(current.amount + expense.amount);
    current.expenseIds.push(expense.id);
    totals.set(expense.categoryId, current);
  }

  return totals;
};

const categoryPriority = (
  absoluteChange: number,
  percentageChange: number,
  income: number,
): InsightPriority => {
  const incomeShare = income > 0 ? absoluteChange / income : 0;
  if (percentageChange >= 100 || incomeShare >= 0.2) return 'high';
  if (percentageChange >= 50 || incomeShare >= 0.1) return 'medium';
  return 'low';
};

export function calculateDashboardInsightMetrics(
  period: BillingPeriod,
  expenses: Expense[],
  income: number,
  today: string,
): DashboardInsightMetrics {
  const invalidExpenseIds = expenses
    .filter((expense) => !isValidExpense(expense))
    .map((expense) => expense.id);

  const relevant = expenses.filter(
    (expense) =>
      !expense.isIgnored &&
      isValidExpense(expense) &&
      isExpenseInsidePeriod(expense, period),
  );

  const consumptionExpenses = relevant.filter((expense) => !expense.isReserve);
  const reserveExpenses = relevant.filter((expense) => expense.isReserve);
  const consumption = toMetricSlice(consumptionExpenses, today);
  const reserves = toMetricSlice(reserveExpenses, today);

  return {
    consumption,
    reserves,
    projectedFreeBalance: roundMoney(
      (Number.isFinite(income) && income >= 0 ? income : 0) - consumption.total - reserves.total,
    ),
    invalidExpenseIds,
  };
}

function buildCategoryChangeInsights(
  input: BuildDashboardInsightsInput,
  currentExpenses: Expense[],
): DashboardInsight[] {
  if (!input.previousPeriod) return [];

  const elapsedDays = periodDayCountThrough(input.period, input.today);
  const previousCutoff = comparableCutoff(input.previousPeriod.period, elapsedDays);
  if (!previousCutoff) return [];

  const currentComparable = currentExpenses.filter(
    (expense) =>
      !expense.isReserve &&
      expense.purchaseDate <= input.today,
  );
  const previousComparable = input.previousPeriod.expenses.filter(
    (expense) =>
      !expense.isIgnored &&
      !expense.isReserve &&
      isValidExpense(expense) &&
      isExpenseInsidePeriod(expense, input.previousPeriod!.period) &&
      expense.purchaseDate <= previousCutoff,
  );

  const currentTotals = categoryTotals(currentComparable);
  const previousTotals = categoryTotals(previousComparable);
  const categoryNames = new Map(input.categories.map((category) => [category.id, category.name]));

  return [...currentTotals.entries()].flatMap(([categoryId, current]) => {
    const baseline = previousTotals.get(categoryId);
    if (!baseline || baseline.amount <= 0 || current.amount <= baseline.amount) return [];

    const absoluteChange = roundMoney(current.amount - baseline.amount);
    const percentageChange = roundMoney((absoluteChange / baseline.amount) * 100);
    const categoryName = categoryNames.get(categoryId) ?? 'Categoria';

    return [{
      id: `category-change:${input.period.id}:${categoryId}`,
      kind: 'category_change' as const,
      priority: categoryPriority(absoluteChange, percentageChange, input.income),
      title: `${categoryName} cresceu no recorte comparável`,
      description:
        `${formatCurrency(current.amount)} lançado até hoje, ` +
        `${formatCurrency(absoluteChange)} acima do mesmo número de dias do período anterior.`,
      evidence: {
        metric: 'category_consumption_change',
        periodId: input.period.id,
        baselinePeriodId: input.previousPeriod.period.id,
        scope: 'lancado_ate_hoje' as const,
        currentValue: current.amount,
        baselineValue: baseline.amount,
        absoluteChange,
        percentageChange,
        categoryId,
        expenseIds: current.expenseIds,
      },
      action: {
        kind: 'filter_expenses' as const,
        label: `Ver lançamentos de ${categoryName}`,
        categoryId,
        dateScope: 'through_today' as const,
      },
    }];
  });
}

function buildGoalInsights(
  input: BuildDashboardInsightsInput,
  currentExpenses: Expense[],
): DashboardInsight[] {
  if (!input.goals?.length) return [];

  const totals = categoryTotals(currentExpenses.filter((expense) => !expense.isReserve));
  const categoryNames = new Map(input.categories.map((category) => [category.id, category.name]));

  return input.goals.flatMap((goal) => {
    if (!Number.isFinite(goal.amount) || goal.amount <= 0) return [];

    const current = totals.get(goal.categoryId);
    if (!current) return [];

    const usage = current.amount / goal.amount;
    if (usage < 0.8) return [];

    const categoryName = categoryNames.get(goal.categoryId) ?? 'Categoria';
    const overage = roundMoney(Math.max(0, current.amount - goal.amount));
    const isOverGoal = overage > 0;

    return [{
      id: `goal-risk:${input.period.id}:${goal.categoryId}`,
      kind: 'goal_risk' as const,
      priority: isOverGoal ? 'high' as const : 'medium' as const,
      title: isOverGoal
        ? `${categoryName} ultrapassou a meta`
        : `${categoryName} está próxima da meta`,
      description: isOverGoal
        ? `${formatCurrency(current.amount)} lançado ou previsto no período, ` +
          `${formatCurrency(overage)} acima da meta.`
        : `${formatCurrency(current.amount)} lançado ou previsto no período, ` +
          `${roundMoney(usage * 100)}% da meta.`,
      evidence: {
        metric: 'category_goal_usage',
        periodId: input.period.id,
        scope: 'periodo_completo' as const,
        currentValue: current.amount,
        baselineValue: goal.amount,
        absoluteChange: overage,
        percentageChange: roundMoney(usage * 100),
        categoryId: goal.categoryId,
        goalValue: goal.amount,
        expenseIds: current.expenseIds,
      },
      action: {
        kind: 'review_goal' as const,
        label: `Revisar meta de ${categoryName}`,
        categoryId: goal.categoryId,
      },
    }];
  });
}

export function buildDashboardInsights(
  input: BuildDashboardInsightsInput,
): DashboardInsight[] {
  const metrics = calculateDashboardInsightMetrics(
    input.period,
    input.expenses,
    input.income,
    input.today,
  );

  const currentExpenses = input.expenses.filter(
    (expense) =>
      !expense.isIgnored &&
      isValidExpense(expense) &&
      isExpenseInsidePeriod(expense, input.period),
  );

  const insights: DashboardInsight[] = [
    ...buildCategoryChangeInsights(input, currentExpenses),
    ...buildGoalInsights(input, currentExpenses),
  ];

  const pendingReserves = currentExpenses.filter(
    (expense) => expense.isReserve && !expense.isFulfilled,
  );
  const pendingReserveAmount = sumExpenses(pendingReserves);

  if (pendingReserveAmount > 0) {
    const launchedPending = pendingReserves.filter(
      (expense) => expense.purchaseDate <= input.today,
    );
    const forecastPending = pendingReserves.filter(
      (expense) => expense.purchaseDate > input.today,
    );
    const scope: InsightScope = launchedPending.length > 0
      ? 'lancado_ate_hoje'
      : 'previsto_apos_hoje';

    insights.push({
      id: `reserve-pending:${input.period.id}`,
      kind: 'reserve_pending',
      priority: input.income > 0 && pendingReserveAmount / input.income >= 0.2
        ? 'high'
        : 'medium',
      title: 'Há reservas ainda não confirmadas',
      description:
        `${formatCurrency(sumExpenses(launchedPending))} lançado até hoje e ` +
        `${formatCurrency(sumExpenses(forecastPending))} previsto após hoje ainda não foram marcados como separados.`,
      evidence: {
        metric: 'pending_reserves',
        periodId: input.period.id,
        scope,
        currentValue: pendingReserveAmount,
        expenseIds: pendingReserves.map((expense) => expense.id),
      },
      action: {
        kind: 'review_reserves',
        label: 'Revisar reservas',
      },
    });
  }

  if (metrics.projectedFreeBalance < 0) {
    insights.push({
      id: `projected-free-balance:${input.period.id}`,
      kind: 'projected_free_balance',
      priority: 'high',
      title: 'O saldo livre projetado está negativo',
      description:
        `Com o que está lançado até hoje e previsto após hoje, faltam ` +
        `${formatCurrency(Math.abs(metrics.projectedFreeBalance))} para fechar o período.`,
      evidence: {
        metric: 'projected_free_balance',
        periodId: input.period.id,
        scope: 'periodo_completo',
        currentValue: metrics.projectedFreeBalance,
        expenseIds: [
          ...metrics.consumption.launchedExpenseIds,
          ...metrics.consumption.forecastExpenseIds,
          ...metrics.reserves.launchedExpenseIds,
          ...metrics.reserves.forecastExpenseIds,
        ],
      },
      action: {
        kind: 'filter_expenses',
        label: 'Revisar lançamentos previstos',
        dateScope: 'after_today',
      },
    });
  }

  return insights
    .sort((left, right) => {
      const priorityDifference = priorityWeight[right.priority] - priorityWeight[left.priority];
      if (priorityDifference !== 0) return priorityDifference;

      const materialityDifference =
        Math.abs(right.evidence.currentValue) - Math.abs(left.evidence.currentValue);
      if (materialityDifference !== 0) return materialityDifference;

      return left.id.localeCompare(right.id);
    })
    .slice(0, Math.max(0, input.maxInsights ?? 3));
}
