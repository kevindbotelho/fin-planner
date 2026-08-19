import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertCircle, Settings2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BillingPeriodSelector } from '@/components/dashboard/BillingPeriodSelector';
import { BankSpendingPanel } from '@/components/dashboard-v2/BankSpendingPanel';
import { DashboardSummaryStrip } from '@/components/dashboard-v2/DashboardSummaryStrip';
import { FinancialGoalsPanel } from '@/components/dashboard-v2/FinancialGoalsPanel';
import { PeriodReservesPanel } from '@/components/dashboard-v2/PeriodReservesPanel';
import { AttentionPanel } from '@/components/dashboard-v2/AttentionPanel';
import { CategoryAnalysisCard } from '@/components/dashboard-v2/CategoryAnalysisCard';
import { FinancialEvolutionCard, type PeriodEvolutionPoint } from '@/components/dashboard-v2/FinancialEvolutionCard';
import { Button } from '@/components/ui/button';
import { useFinance } from '@/contexts/FinanceContext';
import { buildDashboardInsights } from '@/features/dashboard-v2/dashboard.insights';
import { buildCategoryAnalysis, buildDailyConsumptionSeries } from '@/features/dashboard-v2/dashboard.selectors';
import type {
  BankSpendingItem,
  DashboardMetricComparison,
  DashboardMetricKey,
  DashboardSummary,
  FinancialGoalItem,
  PeriodReserveItem,
} from '@/features/dashboard-v2/dashboard.types';
import { derivePeriodMetrics, fromCents } from '@/lib/finance';

const comparisonFor = (
  current: number,
  previous: number | undefined,
  referenceLabel: string | undefined,
  metric: DashboardMetricKey,
): DashboardMetricComparison | undefined => {
  if (previous === undefined || !referenceLabel || previous === 0) return undefined;

  const deltaPercentage = ((current - previous) / Math.abs(previous)) * 100;
  const increaseIsPositive = metric !== 'consumption';
  const tone = deltaPercentage === 0
    ? 'neutral'
    : (deltaPercentage > 0) === increaseIsPositive
      ? 'positive'
      : 'negative';

  return { referenceLabel: `vs ${referenceLabel}`, deltaPercentage, tone };
};

const bankPresentation: Record<string, Pick<BankSpendingItem, 'name' | 'tone' | 'kind'>> = {
  Nubank: { name: 'Nubank', tone: 'purple', kind: 'card' },
  Inter: { name: 'Inter', tone: 'orange', kind: 'card' },
  unassigned: { name: 'Sem emissor informado', tone: 'slate', kind: 'other' },
};

export default function DashboardV2() {
  const navigate = useNavigate();
  const [requestedComparisonPeriodId, setRequestedComparisonPeriodId] = useState<string>();
  const {
    data,
    loading,
    selectedPeriodId,
    setSelectedPeriodId,
    getGoalForCategory,
    toggleExpenseFulfilled,
  } = useFinance();
  const today = format(new Date(), 'yyyy-MM-dd');

  const sortedPeriods = useMemo(
    () => [...data.billingPeriods].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [data.billingPeriods],
  );
  const selectedPeriod = sortedPeriods.find(period => period.id === selectedPeriodId);
  const selectedIndex = selectedPeriod ? sortedPeriods.findIndex(period => period.id === selectedPeriod.id) : -1;
  const comparisonPeriodOptions = selectedIndex > 0 ? sortedPeriods.slice(0, selectedIndex).reverse() : [];
  const previousPeriod = comparisonPeriodOptions.find(period => period.id === requestedComparisonPeriodId)
    ?? comparisonPeriodOptions[0];

  const selectedExpenses = useMemo(
    () => selectedPeriod
      ? data.expenses.filter(expense => expense.purchaseDate >= selectedPeriod.startDate && expense.purchaseDate <= selectedPeriod.endDate)
      : [],
    [data.expenses, selectedPeriod],
  );
  const previousExpenses = useMemo(
    () => previousPeriod
      ? data.expenses.filter(expense => expense.purchaseDate >= previousPeriod.startDate && expense.purchaseDate <= previousPeriod.endDate)
      : [],
    [data.expenses, previousPeriod],
  );
  const selectedIncome = data.monthlyIncomes.find(income => income.billingPeriodId === selectedPeriodId);
  const previousIncome = data.monthlyIncomes.find(income => income.billingPeriodId === previousPeriod?.id);

  const metrics = useMemo(
    () => selectedPeriod
      ? derivePeriodMetrics({ period: selectedPeriod, expenses: selectedExpenses, income: selectedIncome, asOfDate: today })
      : undefined,
    [selectedExpenses, selectedIncome, selectedPeriod, today],
  );
  const previousMetrics = useMemo(
    () => previousPeriod
      ? derivePeriodMetrics({ period: previousPeriod, expenses: previousExpenses, income: previousIncome, asOfDate: today })
      : undefined,
    [previousExpenses, previousIncome, previousPeriod, today],
  );

  const summary: DashboardSummary = useMemo(() => {
    const income = fromCents(metrics?.income.registeredCents ?? 0);
    const consumption = fromCents(metrics?.consumption.knownCents ?? 0);
    const reserved = fromCents(metrics?.reserves.plannedCents ?? 0);
    const freeBalance = fromCents(metrics?.balance.freeAfterKnownPlanCents ?? 0);
    const referenceLabel = previousPeriod?.name;

    return {
      income,
      consumption,
      reserved,
      freeBalance,
      comparisons: {
        income: comparisonFor(income, previousMetrics ? fromCents(previousMetrics.income.registeredCents) : undefined, referenceLabel, 'income'),
        consumption: comparisonFor(consumption, previousMetrics ? fromCents(previousMetrics.consumption.knownCents) : undefined, referenceLabel, 'consumption'),
        reserved: comparisonFor(reserved, previousMetrics ? fromCents(previousMetrics.reserves.plannedCents) : undefined, referenceLabel, 'reserved'),
        freeBalance: comparisonFor(freeBalance, previousMetrics ? fromCents(previousMetrics.balance.freeAfterKnownPlanCents) : undefined, referenceLabel, 'freeBalance'),
      },
    };
  }, [metrics, previousMetrics, previousPeriod?.name]);

  const categoryAnalysis = useMemo(
    () => buildCategoryAnalysis(selectedExpenses, previousExpenses, data.categories),
    [data.categories, previousExpenses, selectedExpenses],
  );

  const effectiveGoals = useMemo(() => {
    if (!selectedPeriodId) return [];
    return data.categories.flatMap(category => {
      const amount = getGoalForCategory(category.id, selectedPeriodId);
      return amount > 0 ? [{ id: `${selectedPeriodId}:${category.id}`, categoryId: category.id, amount }] : [];
    });
  }, [data.categories, getGoalForCategory, selectedPeriodId]);

  const goalItems: FinancialGoalItem[] = useMemo(() => effectiveGoals.map(goal => {
    const category = data.categories.find(item => item.id === goal.categoryId);
    const spent = fromCents(metrics?.categories.find(item => item.id === goal.categoryId)?.knownCents ?? 0);
    const percentage = goal.amount > 0 ? (spent / goal.amount) * 100 : 0;

    return {
      id: goal.id,
      label: category?.name ?? 'Categoria',
      spent,
      limit: goal.amount,
      percentage,
      status: percentage > 100 ? 'over' : percentage >= 80 ? 'warning' : 'on-track',
      scopeLabel: 'limite',
    };
  }).sort((a, b) => b.percentage - a.percentage), [data.categories, effectiveGoals, metrics?.categories]);

  const reserveItems: PeriodReserveItem[] = useMemo(() => selectedExpenses
    .filter(expense => expense.isReserve && !expense.isIgnored)
    .map(expense => {
      const separatedAsOf = Boolean(expense.isFulfilled) && (!expense.fulfilledAt || expense.fulfilledAt.slice(0, 10) <= today);
      return {
        id: expense.id,
        label: expense.description,
        planned: expense.amount,
        separated: separatedAsOf ? expense.amount : 0,
        categoryLabel: data.categories.find(category => category.id === expense.categoryId)?.name,
      };
    })
    .sort((a, b) => b.planned - a.planned), [data.categories, selectedExpenses, today]);

  const bankItems: BankSpendingItem[] = useMemo(() => (metrics?.banks ?? [])
    .filter(bank => bank.knownCents > 0)
    .map(bank => ({
      id: bank.id,
      amount: fromCents(bank.knownCents),
      percentage: bank.shareOfKnownBps / 100,
      ...bankPresentation[bank.id],
    })), [metrics?.banks]);

  const insights = useMemo(() => selectedPeriod ? buildDashboardInsights({
    period: selectedPeriod,
    expenses: selectedExpenses,
    categories: data.categories,
    income: summary.income,
    today,
    previousPeriod: previousPeriod ? { period: previousPeriod, expenses: previousExpenses } : undefined,
    goals: effectiveGoals.map(goal => ({ id: goal.id, categoryId: goal.categoryId, amount: goal.amount })),
    maxInsights: 3,
  }) : [], [data.categories, effectiveGoals, previousExpenses, previousPeriod, selectedExpenses, selectedPeriod, summary.income, today]);

  const dailySeries = useMemo(
    () => selectedPeriod ? buildDailyConsumptionSeries(selectedPeriod, selectedExpenses, today) : [],
    [selectedExpenses, selectedPeriod, today],
  );

  const evolution: PeriodEvolutionPoint[] = useMemo(() => sortedPeriods.slice(-12).map(period => {
    const periodMetrics = derivePeriodMetrics({
      period,
      expenses: data.expenses,
      income: data.monthlyIncomes.find(item => item.billingPeriodId === period.id),
      asOfDate: today,
    });

    return {
      id: period.id,
      label: period.name,
      consumptionCents: periodMetrics.consumption.knownCents,
      reservesCents: periodMetrics.reserves.plannedCents,
      incomeCents: periodMetrics.income.registeredCents,
    };
  }), [data.expenses, data.monthlyIncomes, sortedPeriods, today]);

  if (!loading && data.billingPeriods.length === 0) {
    return (
      <section className="liquid-glass liquid-glass-bevel rounded-2xl p-10 text-center">
        <Settings2 className="mx-auto h-9 w-9 text-brand-500" aria-hidden="true" />
        <h1 className="mt-4 font-manrope text-xl font-bold">Prepare seu primeiro período de fatura</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">O Dashboard 2.0 usa seus períodos, receitas, categorias e lançamentos já existentes.</p>
        <Button asChild className="mt-6 rounded-xl"><Link to="/configuracoes">Abrir configurações</Link></Button>
      </section>
    );
  }

  return (
    <div className="-mt-6 space-y-5 animate-fade-in md:-mt-8">
      <h1 className="sr-only">Dashboard 2.0</h1>

      <DashboardSummaryStrip
        summary={summary}
        loading={loading || !selectedPeriod}
        periodSelector={(
          <BillingPeriodSelector
            periods={data.billingPeriods}
            selectedPeriodId={selectedPeriodId}
            onSelect={setSelectedPeriodId}
          />
        )}
      />

      {metrics && metrics.qualityIssues.length > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p><strong>{metrics.qualityIssues.length} ponto(s) de qualidade</strong> foram identificado(s). Valores inválidos não entram nos totais; inconsistências de reserva permanecem visíveis para revisão.</p>
        </div>
      ) : null}

      {selectedPeriod ? (
        <>
          <div className="grid gap-5 xl:grid-cols-12">
            <CategoryAnalysisCard
              className="xl:col-span-8"
              items={categoryAnalysis}
              periodId={selectedPeriod.id}
              previousPeriodLabel={previousPeriod?.name}
              comparisonOptions={comparisonPeriodOptions.map(period => ({ id: period.id, label: period.name }))}
              comparisonPeriodId={previousPeriod?.id}
              onComparisonPeriodChange={setRequestedComparisonPeriodId}
              loading={loading}
            />
            <div className="grid content-start gap-5 xl:col-span-4">
              <AttentionPanel insights={insights} periodId={selectedPeriod.id} loading={loading} />
              <FinancialEvolutionCard periods={evolution} daily={dailySeries} loading={loading} />
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <div id="metas-financeiras">
              <FinancialGoalsPanel goals={goalItems} loading={loading} onViewAll={() => navigate('/configuracoes')} />
            </div>
            <div id="reservas-periodo">
              <PeriodReservesPanel
                loading={loading}
                items={reserveItems}
                summary={{
                  planned: fromCents(metrics.reserves.plannedCents),
                  separated: fromCents(metrics.reserves.separatedAsOfCents),
                  pending: fromCents(metrics.reserves.pendingAsOfCents),
                }}
                onSelectReserve={reserve => void toggleExpenseFulfilled(reserve.id, reserve.separated < reserve.planned)}
              />
            </div>
            <BankSpendingPanel
              banks={bankItems}
              total={fromCents(metrics.consumption.knownCents)}
              loading={loading}
              onViewAll={() => navigate(`/despesas?period=${encodeURIComponent(selectedPeriod.id)}`)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
