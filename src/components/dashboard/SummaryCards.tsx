import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SummaryCardsProps {
  income: number;
  expenses: number;
  balance: number;
}

export function SummaryCards({ income, expenses, balance }: SummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Receita</p>
              <p className="mt-1 text-2xl font-bold text-income">{formatCurrency(income)}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-income/10">
              <TrendingUp className="h-6 w-6 text-income" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Despesas</p>
              <p className="mt-1 text-2xl font-bold text-expense">{formatCurrency(expenses)}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-expense/10">
              <TrendingDown className="h-6 w-6 text-expense" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Saldo</p>
              <p className={`mt-1 text-2xl font-bold ${balance >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatCurrency(balance)}
              </p>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${balance >= 0 ? 'bg-income/10' : 'bg-expense/10'}`}>
              <Wallet className={`h-6 w-6 ${balance >= 0 ? 'text-income' : 'text-expense'}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
