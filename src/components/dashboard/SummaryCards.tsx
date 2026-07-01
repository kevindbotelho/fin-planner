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
    <div className="grid gap-6 sm:grid-cols-3">
      {/* Card Receita */}
      <Card className="liquid-glass liquid-glass-bevel rounded-2xl border-0 shadow-sm transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-slate-900/5 group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase font-manrope">Receita</p>
              <p className="mt-1.5 text-2xl lg:text-3xl font-extrabold font-manrope bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                {formatCurrency(income)}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 transition-all duration-300 group-hover:scale-110">
              <TrendingUp className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Despesas */}
      <Card className="liquid-glass liquid-glass-bevel rounded-2xl border-0 shadow-sm transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-slate-900/5 group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase font-manrope">Despesas</p>
              <p className="mt-1.5 text-2xl lg:text-3xl font-extrabold font-manrope bg-gradient-to-r from-rose-500 to-orange-500 dark:from-rose-400 dark:to-orange-400 bg-clip-text text-transparent">
                {formatCurrency(expenses)}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/20 dark:border-rose-500/30 transition-all duration-300 group-hover:scale-110">
              <TrendingDown className="h-5 w-5 text-rose-500 dark:text-rose-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Saldo */}
      <Card className="liquid-glass liquid-glass-bevel rounded-2xl border-0 shadow-sm transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-slate-900/5 group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase font-manrope">Saldo</p>
              <p className={`mt-1.5 text-2xl lg:text-3xl font-extrabold font-manrope bg-gradient-to-r bg-clip-text text-transparent ${
                balance >= 0 
                  ? 'from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300' 
                  : 'from-rose-500 to-orange-500 dark:from-rose-400 dark:to-orange-400'
              }`}>
                {formatCurrency(balance)}
              </p>
            </div>
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${
              balance >= 0 
                ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30' 
                : 'bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/20 dark:border-rose-500/30'
            }`}>
              <Wallet className={`h-5 w-5 ${
                balance >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
              }`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
