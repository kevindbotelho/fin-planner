import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Expense } from '@/types/finance';
import { Building2, Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BankSummaryWidgetProps {
  expenses: Expense[];
}

export function BankSummaryWidget({ expenses }: BankSummaryWidgetProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const bankStats = useMemo(() => {
    let reservaTotal = 0;
    let nubankTotal = 0;
    let interTotal = 0;
    let outrosTotal = 0;

    expenses.forEach(expense => {
      if (expense.isReserve) {
        reservaTotal += expense.amount;
        return;
      }

      if (expense.bankOrigin === 'Nubank') {
        nubankTotal += expense.amount;
      } else if (expense.bankOrigin === 'Inter') {
        interTotal += expense.amount;
      } else {
        outrosTotal += expense.amount;
      }
    });

    const total = nubankTotal + interTotal + outrosTotal + reservaTotal;

    return {
      nubankTotal,
      interTotal,
      outrosTotal,
      reservaTotal,
      total,
      nubankPercentage: total > 0 ? (nubankTotal / total) * 100 : 0,
      interPercentage: total > 0 ? (interTotal / total) * 100 : 0,
      outrosPercentage: total > 0 ? (outrosTotal / total) * 100 : 0,
      reservaPercentage: total > 0 ? (reservaTotal / total) * 100 : 0,
    };
  }, [expenses]);

  if (expenses.length === 0) return null;

  return (
    <Card className="liquid-glass liquid-glass-bevel col-span-full flex max-h-none flex-col overflow-hidden rounded-2xl border-0 shadow-sm lg:max-h-[calc(50%-0.75rem)] lg:shrink-0 xl:col-span-1">
      <CardHeader className="shrink-0 pb-2">
        <CardTitle className="text-base font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Building2 className="h-4.5 w-4.5 text-brand-500" />
          Despesas por Banco
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <div className="mt-2 flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 space-y-3.5 overflow-y-auto pr-2 custom-scrollbar">
            {bankStats.nubankTotal > 0 && (
            <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-all duration-200">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-white border border-slate-200/50 shadow-sm flex items-center justify-center p-1.5 overflow-hidden">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/f/f7/Nubank_logo_2021.svg" alt="Nubank" className="h-full w-full object-contain" />
                </div>
                <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Nubank</span>
              </div>
              <div className="text-right whitespace-nowrap ml-2 shrink-0">
                <p className="font-bold text-xs text-slate-800 dark:text-slate-100">{formatCurrency(bankStats.nubankTotal)}</p>
                <p className="text-[10px] text-slate-400 font-mono font-medium">{bankStats.nubankPercentage.toFixed(1)}%</p>
              </div>
            </div>
            )}
          
            {bankStats.interTotal > 0 && (
            <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-all duration-200">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-white border border-slate-200/50 shadow-sm flex items-center justify-center p-1.5 overflow-hidden">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/8/8f/Logo_do_banco_Inter_%282023%29.svg" alt="Inter" className="h-full w-full object-contain" />
                </div>
                <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Inter</span>
              </div>
              <div className="text-right whitespace-nowrap ml-2 shrink-0">
                <p className="font-bold text-xs text-slate-800 dark:text-slate-100">{formatCurrency(bankStats.interTotal)}</p>
                <p className="text-[10px] text-slate-400 font-mono font-medium">{bankStats.interPercentage.toFixed(1)}%</p>
              </div>
            </div>
            )}

            {bankStats.reservaTotal > 0 && (
            <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-all duration-200">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center dark:bg-blue-500/15 dark:border-blue-500/10 shrink-0">
                  <Landmark className="h-4 w-4 text-blue-500" />
                </div>
                <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Reserva</span>
              </div>
              <div className="text-right whitespace-nowrap ml-2 shrink-0">
                <p className="font-bold text-xs text-slate-800 dark:text-slate-100">{formatCurrency(bankStats.reservaTotal)}</p>
                <p className="text-[10px] text-slate-400 font-mono font-medium">{bankStats.reservaPercentage.toFixed(1)}%</p>
              </div>
            </div>
            )}

            {bankStats.outrosTotal > 0 && (
            <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-all duration-200">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center shrink-0">
                  <span className="text-slate-500 font-bold text-xs">?</span>
                </div>
                <span className="font-semibold text-xs text-slate-400 dark:text-slate-500">Não Especificado</span>
              </div>
              <div className="text-right whitespace-nowrap ml-2 shrink-0">
                <p className="font-bold text-xs text-slate-400 dark:text-slate-500">{formatCurrency(bankStats.outrosTotal)}</p>
                <p className="text-[10px] text-slate-400 font-mono font-medium">{bankStats.outrosPercentage.toFixed(1)}%</p>
              </div>
            </div>
            )}
          
          </div>

          <div className="mt-3 shrink-0 border-t border-slate-200/50 pt-3 dark:border-slate-800/50">
            {/* Visual representation bar */}
            <div className="h-2 w-full rounded-full flex overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 shadow-inner">
              {bankStats.nubankPercentage > 0 && (
                <div 
                  className="bg-[#8a05be] h-full transition-all duration-500" 
                  style={{ width: `${bankStats.nubankPercentage}%` }} 
                />
              )}
              {bankStats.interPercentage > 0 && (
                <div 
                  className="bg-[#ff7a00] h-full transition-all duration-500" 
                  style={{ width: `${bankStats.interPercentage}%` }} 
                />
              )}
              {bankStats.reservaPercentage > 0 && (
                <div 
                  className="bg-[#3b82f6] h-full transition-all duration-500" 
                  style={{ width: `${bankStats.reservaPercentage}%` }} 
                />
              )}
              {bankStats.outrosPercentage > 0 && (
                <div 
                  className="bg-slate-400 h-full transition-all duration-500" 
                  style={{ width: `${bankStats.outrosPercentage}%` }} 
                />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
