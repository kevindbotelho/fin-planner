import { CheckCircle2, Clock3, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { PeriodReserveItem, PeriodReservesSummary } from '@/features/dashboard-v2/dashboard.types';
import { clampPercentage, formatCurrency } from './utils';

interface PeriodReservesPanelProps {
  summary: PeriodReservesSummary;
  items?: PeriodReserveItem[];
  loading?: boolean;
  onSelectReserve?: (reserve: PeriodReserveItem) => void;
  className?: string;
}

function ReservesSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton className="h-20 rounded-xl" key={index} />
        ))}
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
}

export function PeriodReservesPanel({
  summary,
  items = [],
  loading = false,
  onSelectReserve,
  className,
}: PeriodReservesPanelProps) {
  const completion = summary.planned > 0 ? (summary.separated / summary.planned) * 100 : 0;
  const isEmpty = summary.planned === 0 && items.length === 0;

  return (
    <Card aria-busy={loading} className={cn('liquid-glass liquid-glass-bevel flex h-full flex-col rounded-2xl border-0 shadow-sm', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 font-manrope text-base font-bold text-slate-800 dark:text-slate-100">
          <Landmark aria-hidden="true" className="h-4.5 w-4.5 text-brand-500" />
          Reservas do período
        </CardTitle>
        {!loading && summary.pending > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
            Pendente
          </span>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        {loading ? (
          <ReservesSkeleton />
        ) : isEmpty ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/80 px-5 py-8 text-center dark:border-slate-800/80">
            <Landmark aria-hidden="true" className="h-7 w-7 text-slate-300 dark:text-slate-700" />
            <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Nenhuma reserva planejada</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400 dark:text-slate-500">
              Valores planejados para este período aparecerão aqui, separados do consumo.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200/70 bg-white/35 p-3 dark:border-slate-800/80 dark:bg-slate-950/20">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Planejado</dt>
                <dd className="mt-1.5 text-sm font-extrabold tabular-nums text-slate-800 dark:text-slate-100">{formatCurrency(summary.planned)}</dd>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 dark:bg-emerald-500/10">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70">Separado</dt>
                <dd className="mt-1.5 text-sm font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(summary.separated)}</dd>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 dark:bg-amber-500/10">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70">Pendente</dt>
                <dd className="mt-1.5 text-sm font-extrabold tabular-nums text-amber-600 dark:text-amber-400">{formatCurrency(summary.pending)}</dd>
              </div>
            </dl>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-slate-500 dark:text-slate-400">Progresso do período</span>
                <span className="font-bold tabular-nums text-slate-700 dark:text-slate-200">{completion.toFixed(0)}%</span>
              </div>
              <Progress
                aria-label={`${completion.toFixed(0)}% das reservas do período já foram separadas`}
                value={clampPercentage(completion)}
                className="h-2 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/70"
                indicatorClassName="rounded-full bg-emerald-500 dark:bg-emerald-400"
              />
            </div>

            {items.length > 0 && (
              <div className="space-y-2 border-t border-slate-200/60 pt-4 dark:border-slate-800/70">
                {items.map((item) => {
                  const pending = Math.max(item.planned - item.separated, 0);
                  const complete = pending === 0 && item.planned > 0;
                  const content = (
                    <>
                      <div className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                        complete
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                          : 'border-amber-500/20 bg-amber-500/10 text-amber-500',
                      )}>
                        {complete
                          ? <CheckCircle2 aria-hidden="true" className="h-4.5 w-4.5" />
                          : <Clock3 aria-hidden="true" className="h-4.5 w-4.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{item.label}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                          {item.categoryLabel ?? (complete ? 'Valor separado' : `${formatCurrency(pending)} pendente`)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">{formatCurrency(item.planned)}</p>
                        <p className="mt-0.5 text-xs tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(item.separated)} separado</p>
                      </div>
                    </>
                  );

                  return onSelectReserve ? (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => onSelectReserve(item)}
                      className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-slate-200/60 bg-white/25 p-3 text-left transition-colors hover:bg-white/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-slate-800/70 dark:bg-slate-950/10 dark:hover:bg-slate-900/50 dark:focus-visible:ring-offset-slate-950"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200/60 bg-white/25 p-3 dark:border-slate-800/70 dark:bg-slate-950/10" key={item.id}>
                      {content}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { PeriodReservesPanelProps };
