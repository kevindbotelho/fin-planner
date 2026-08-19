import { eachDayOfInterval, format, parseISO } from 'date-fns';
import type { BillingPeriod, Category, Expense } from '@/types/finance';
import { toCents, type MoneyCents } from '@/lib/finance';

export interface CategoryTransactionItem {
  id: string;
  description: string;
  amountCents: MoneyCents;
  purchaseDate: string;
  type: Expense['type'];
  subcategoryId: string;
  subcategoryName: string;
  bankOrigin: Expense['bankOrigin'];
}

export interface SubcategoryAnalysisItem {
  id: string;
  name: string;
  currentCents: MoneyCents;
  shareOfCategoryBps: number;
  transactions: CategoryTransactionItem[];
}

export interface CategoryAnalysisItem {
  id: string;
  name: string;
  color: string;
  currentCents: MoneyCents;
  previousCents: MoneyCents;
  shareOfConsumptionBps: number;
  changePercent: number | null;
  fixedCents: MoneyCents;
  variableCents: MoneyCents;
  subcategories: SubcategoryAnalysisItem[];
}

export interface DailyConsumptionPoint {
  date: string;
  label: string;
  launchedCents: MoneyCents;
  forecastCents: MoneyCents;
  cumulativeKnownCents: MoneyCents;
}

const eligibleConsumption = (expense: Expense) =>
  !expense.isIgnored && !expense.isReserve && Number.isFinite(expense.amount) && expense.amount >= 0;

const percentageChange = (currentCents: number, previousCents: number): number | null => {
  if (previousCents === 0) return currentCents === 0 ? 0 : null;
  return ((currentCents - previousCents) / previousCents) * 100;
};

const basisPoints = (valueCents: number, totalCents: number) =>
  totalCents > 0 ? Math.round((valueCents * 10_000) / totalCents) : 0;

export function buildCategoryAnalysis(
  currentExpenses: readonly Expense[],
  previousExpenses: readonly Expense[],
  categories: readonly Category[],
): CategoryAnalysisItem[] {
  const current = currentExpenses.filter(eligibleConsumption);
  const previous = previousExpenses.filter(eligibleConsumption);
  const totalCurrentCents = current.reduce((sum, expense) => sum + toCents(expense.amount), 0);

  return categories
    .map(category => {
      const currentCategoryExpenses = current.filter(expense => expense.categoryId === category.id);
      const previousCents = previous
        .filter(expense => expense.categoryId === category.id)
        .reduce((sum, expense) => sum + toCents(expense.amount), 0);
      const currentCents = currentCategoryExpenses.reduce(
        (sum, expense) => sum + toCents(expense.amount),
        0,
      );

      const subcategories = category.subcategories
        .map(subcategory => {
          const transactions = currentCategoryExpenses
            .filter(expense => expense.subcategoryId === subcategory.id)
            .map(expense => ({
              id: expense.id,
              description: expense.description,
              amountCents: toCents(expense.amount),
              purchaseDate: expense.purchaseDate,
              type: expense.type,
              subcategoryId: subcategory.id,
              subcategoryName: subcategory.name,
              bankOrigin: expense.bankOrigin,
            }))
            .sort((a, b) => b.amountCents - a.amountCents);
          const subcategoryCents = transactions.reduce((sum, item) => sum + item.amountCents, 0);

          return {
            id: subcategory.id,
            name: subcategory.name,
            currentCents: subcategoryCents,
            shareOfCategoryBps: basisPoints(subcategoryCents, currentCents),
            transactions,
          };
        })
        .filter(item => item.currentCents > 0)
        .sort((a, b) => b.currentCents - a.currentCents);

      return {
        id: category.id,
        name: category.name,
        color: category.color,
        currentCents,
        previousCents,
        shareOfConsumptionBps: basisPoints(currentCents, totalCurrentCents),
        changePercent: percentageChange(currentCents, previousCents),
        fixedCents: currentCategoryExpenses
          .filter(expense => expense.type === 'fixed')
          .reduce((sum, expense) => sum + toCents(expense.amount), 0),
        variableCents: currentCategoryExpenses
          .filter(expense => expense.type === 'variable')
          .reduce((sum, expense) => sum + toCents(expense.amount), 0),
        subcategories,
      };
    })
    .filter(item => item.currentCents > 0)
    .sort((a, b) => b.currentCents - a.currentCents);
}

export function buildDailyConsumptionSeries(
  period: BillingPeriod,
  expenses: readonly Expense[],
  asOfDate: string,
): DailyConsumptionPoint[] {
  const byDate = new Map<string, number>();

  for (const expense of expenses.filter(eligibleConsumption)) {
    if (expense.purchaseDate < period.startDate || expense.purchaseDate > period.endDate) continue;
    byDate.set(expense.purchaseDate, (byDate.get(expense.purchaseDate) ?? 0) + toCents(expense.amount));
  }

  let cumulativeKnownCents = 0;

  return eachDayOfInterval({
    start: parseISO(period.startDate),
    end: parseISO(period.endDate),
  }).map(day => {
    const date = format(day, 'yyyy-MM-dd');
    const amountCents = byDate.get(date) ?? 0;
    cumulativeKnownCents += amountCents;

    return {
      date,
      label: format(day, 'dd/MM'),
      launchedCents: date <= asOfDate ? amountCents : 0,
      forecastCents: date > asOfDate ? amountCents : 0,
      cumulativeKnownCents,
    };
  });
}
