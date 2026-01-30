import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart';
import { CategoryDonutChart } from '@/components/dashboard/CategoryDonutChart';
import { BillingPeriodSelector } from '@/components/dashboard/BillingPeriodSelector';
import { ExpenseHierarchyTable } from '@/components/dashboard/ExpenseHierarchyTable';

export default function Dashboard() {
  const { data, getExpensesForPeriod, getIncomeForPeriod } = useFinance();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(
    data.billingPeriods[0]?.id || null
  );

  const selectedPeriod = data.billingPeriods.find(p => p.id === selectedPeriodId);
  const periodExpenses = selectedPeriodId ? getExpensesForPeriod(selectedPeriodId) : [];
  const periodIncome = selectedPeriodId ? getIncomeForPeriod(selectedPeriodId) : undefined;

  const totalExpenses = periodExpenses.reduce((acc, exp) => acc + exp.amount, 0);
  const totalIncome = (periodIncome?.salary || 0) + (periodIncome?.extra || 0);
  const balance = totalIncome - totalExpenses;

  // Dados para o gráfico de linha (últimos períodos)
  const chartData = useMemo(() => {
    const sortedPeriods = [...data.billingPeriods]
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(-6);

    return sortedPeriods.map(period => {
      const expenses = getExpensesForPeriod(period.id);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral das suas finanças</p>
        </div>
        <BillingPeriodSelector
          periods={data.billingPeriods}
          selectedPeriodId={selectedPeriodId}
          onSelect={setSelectedPeriodId}
        />
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

          <div className="grid gap-6 lg:grid-cols-2">
            <IncomeExpenseChart data={chartData} />
            <CategoryDonutChart
              expenses={periodExpenses}
              categories={data.categories}
            />
          </div>

          <ExpenseHierarchyTable
            expenses={periodExpenses}
            categories={data.categories}
            totalIncome={totalIncome}
          />
        </>
      )}
    </div>
  );
}
