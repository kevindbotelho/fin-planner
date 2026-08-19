import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart';
import { CategoryDonutChart } from '@/components/dashboard/CategoryDonutChart';
import { BillingPeriodSelector } from '@/components/dashboard/BillingPeriodSelector';
import { DashboardExpenseTable } from '@/components/dashboard/DashboardExpenseTable';
import { FinancialGoalsWidget } from '@/components/dashboard/FinancialGoalsWidget';
import { BankSummaryWidget } from '@/components/dashboard/BankSummaryWidget';
import { ReservesWidget } from '@/components/dashboard/ReservesWidget';
import { Button } from '@/components/ui/button';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { data, getExpensesForPeriod, getIncomeForPeriod, selectedPeriodId, setSelectedPeriodId } = useFinance();

  const selectedPeriod = data.billingPeriods.find(p => p.id === selectedPeriodId);
  const periodExpenses = selectedPeriodId 
    ? getExpensesForPeriod(selectedPeriodId).filter(e => !e.isIgnored) 
    : [];
  const periodIncome = selectedPeriodId ? getIncomeForPeriod(selectedPeriodId) : undefined;

  const totalExpenses = periodExpenses.reduce((acc, exp) => acc + exp.amount, 0);
  const totalIncome = (periodIncome?.salary || 0) + (periodIncome?.extra || 0);
  const balance = totalIncome - totalExpenses;

  const chartData = useMemo(() => {
    const sortedPeriods = [...data.billingPeriods]
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(-6);

    return sortedPeriods.map(period => {
      const expenses = getExpensesForPeriod(period.id).filter(e => !e.isIgnored);
      const income = getIncomeForPeriod(period.id);
      const totalExp = expenses.reduce((acc, exp) => acc + exp.amount, 0);
      const totalInc = (income?.salary || 0) + (income?.extra || 0);

      return {
        name: period.name,
        receita: totalInc,
        despesas: totalExp,
      };
    });
  }, [data.billingPeriods, getExpensesForPeriod, getIncomeForPeriod]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
        <div>
          <h1 className="text-xl font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100">Dashboard</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Visão geral das suas finanças</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button asChild variant="outline" className="h-[42px] rounded-xl border-brand-500/30 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10">
            <Link to="/dashboard-2">
              Experimentar Dashboard 2.0
              <ArrowUpRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <BillingPeriodSelector
            periods={data.billingPeriods}
            selectedPeriodId={selectedPeriodId}
            onSelect={setSelectedPeriodId}
          />
        </div>
      </div>

      {data.billingPeriods.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-12 text-center">
          <h3 className="text-lg font-semibold text-foreground">Comece aqui!</h3>
          <p className="mt-2 text-muted-foreground">
            Vá em Configurações para cadastrar seus períodos de fatura, categorias e receitas mensais.
          </p>
        </div>
      ) : (
        <>
          <SummaryCards
            income={totalIncome}
            expenses={totalExpenses}
            balance={balance}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="flex flex-col space-y-6 lg:col-span-2">
              <IncomeExpenseChart 
                monthlyData={chartData} 
                periodExpenses={periodExpenses}
                selectedPeriod={selectedPeriod}
              />
              <FinancialGoalsWidget />
              <ReservesWidget />
            </div>
            <div className="min-h-0 lg:relative">
              <div className="flex min-h-0 flex-col gap-6 lg:absolute lg:inset-0">
                <CategoryDonutChart
                  expenses={periodExpenses}
                  categories={data.categories}
                />
                <BankSummaryWidget expenses={periodExpenses} />
              </div>
            </div>
          </div>

          <DashboardExpenseTable
            expenses={periodExpenses}
            categories={data.categories}
            totalIncome={totalIncome}
          />
        </>
      )}
    </div>
  );
}
