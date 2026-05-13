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
    <Card className="border-0 shadow-sm flex flex-col h-full col-span-full xl:col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          Despesas por Banco
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-4 mt-2">
          {bankStats.nubankTotal > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white border shadow-sm flex items-center justify-center p-1">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/f/f7/Nubank_logo_2021.svg" alt="Nubank" className="h-full w-full object-contain" />
                </div>
                <span className="font-medium">Nubank</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-expense">{formatCurrency(bankStats.nubankTotal)}</p>
                <p className="text-xs text-muted-foreground">{bankStats.nubankPercentage.toFixed(1)}%</p>
              </div>
            </div>
          )}
          
          {bankStats.interTotal > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white border shadow-sm flex items-center justify-center p-1">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/8/8f/Logo_do_banco_Inter_%282023%29.svg" alt="Inter" className="h-full w-full object-contain" />
                </div>
                <span className="font-medium">Inter</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-expense">{formatCurrency(bankStats.interTotal)}</p>
                <p className="text-xs text-muted-foreground">{bankStats.interPercentage.toFixed(1)}%</p>
              </div>
            </div>
          )}

          {bankStats.reservaTotal > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center dark:bg-blue-900/20 dark:border-blue-800">
                  <Landmark className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-medium">Reserva</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-expense">{formatCurrency(bankStats.reservaTotal)}</p>
                <p className="text-xs text-muted-foreground">{bankStats.reservaPercentage.toFixed(1)}%</p>
              </div>
            </div>
          )}

          {bankStats.outrosTotal > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <span className="text-slate-600 font-bold text-sm">?</span>
                </div>
                <span className="font-medium text-muted-foreground">Não Especificado</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-muted-foreground">{formatCurrency(bankStats.outrosTotal)}</p>
                <p className="text-xs text-muted-foreground">{bankStats.outrosPercentage.toFixed(1)}%</p>
              </div>
            </div>
          )}
          
          <div className="pt-4 border-t border-border/50">
            {/* Visual representation bar */}
            <div className="h-2 w-full rounded-full flex overflow-hidden bg-muted">
              {bankStats.nubankPercentage > 0 && (
                <div 
                  className="bg-purple-500 h-full transition-all duration-500" 
                  style={{ width: `${bankStats.nubankPercentage}%` }} 
                />
              )}
              {bankStats.interPercentage > 0 && (
                <div 
                  className="bg-orange-500 h-full transition-all duration-500" 
                  style={{ width: `${bankStats.interPercentage}%` }} 
                />
              )}
              {bankStats.reservaPercentage > 0 && (
                <div 
                  className="bg-blue-500 h-full transition-all duration-500" 
                  style={{ width: `${bankStats.reservaPercentage}%` }} 
                />
              )}
              {bankStats.outrosPercentage > 0 && (
                <div 
                  className="bg-slate-300 h-full transition-all duration-500" 
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
