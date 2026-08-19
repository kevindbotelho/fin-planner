import { Building2, ChevronRight, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { BankSpendingItem, BankSpendingTone } from '@/features/dashboard-v2/dashboard.types';
import { clampPercentage, formatCurrency } from './utils';

interface BankSpendingPanelProps {
  banks: BankSpendingItem[];
  total?: number;
  loading?: boolean;
  onViewAll?: () => void;
  className?: string;
}

const toneClasses: Record<BankSpendingTone, { icon: string; bar: string }> = {
  purple: { icon: 'border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400', bar: 'bg-purple-500' },
  orange: { icon: 'border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400', bar: 'bg-orange-500' },
  blue: { icon: 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400', bar: 'bg-blue-500' },
  emerald: { icon: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
  slate: { icon: 'border-slate-300/70 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400', bar: 'bg-slate-400' },
};

function BankSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <Skeleton className="h-16 w-full rounded-xl" />
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="flex items-center gap-3" key={index}>
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BankSpendingPanel({
  banks,
  total,
  loading = false,
  onViewAll,
  className,
}: BankSpendingPanelProps) {
  const computedTotal = total ?? banks.reduce((sum, bank) => sum + bank.amount, 0);

  return (
    <Card aria-busy={loading} className={cn('liquid-glass liquid-glass-bevel flex h-full flex-col rounded-2xl border-0 shadow-sm', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
        <CardTitle className="flex items-center gap-2 font-manrope text-base font-bold text-slate-800 dark:text-slate-100">
          <Building2 aria-hidden="true" className="h-4.5 w-4.5 text-brand-500" />
          Gastos por banco/emissor
        </CardTitle>
        {onViewAll && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="h-9 rounded-xl px-3 text-xs font-semibold text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
          >
            Ver detalhes
            <ChevronRight aria-hidden="true" className="ml-1 h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        {loading ? (
          <BankSkeleton />
        ) : banks.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/80 px-5 py-8 text-center dark:border-slate-800/80">
            <Building2 aria-hidden="true" className="h-7 w-7 text-slate-300 dark:text-slate-700" />
            <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Nenhum emissor identificado</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400 dark:text-slate-500">
              Os gastos serão agrupados por banco ou emissor quando essa informação estiver disponível.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200/70 bg-white/35 p-4 dark:border-slate-800/80 dark:bg-slate-950/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total do período</p>
              <p className="mt-1 font-manrope text-xl font-extrabold tabular-nums text-slate-800 dark:text-slate-100">
                {formatCurrency(computedTotal)}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Consumo conhecido agrupado por banco ou emissor</p>
            </div>

            <ul className="space-y-4" aria-label="Distribuição dos gastos por banco ou emissor">
              {banks.map((bank) => {
                const percentage = bank.percentage ?? (computedTotal > 0 ? (bank.amount / computedTotal) * 100 : 0);
                const tone = bank.tone ?? 'slate';
                const Icon = bank.kind === 'card' ? CreditCard : Building2;

                return (
                  <li className="flex items-center gap-3" key={bank.id}>
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', toneClasses[tone].icon)}>
                      <Icon aria-hidden="true" className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{bank.name}</span>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">{formatCurrency(bank.amount)}</p>
                          <p className="text-xs tabular-nums text-slate-400 dark:text-slate-500">{percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div
                        aria-label={`${bank.name}: ${percentage.toFixed(1)}% dos gastos identificados`}
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={clampPercentage(percentage)}
                        className="h-2 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/70"
                        role="progressbar"
                      >
                        <div className={cn('h-full rounded-full', toneClasses[tone].bar)} style={{ width: `${clampPercentage(percentage)}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { BankSpendingPanelProps };
