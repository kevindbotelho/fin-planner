import type { ComponentType, ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  TrendingDown,
  TrendingUp,
  Wallet,
  WalletCards,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type {
  DashboardComparisonTone,
  DashboardMetricComparison,
  DashboardMetricKey,
  DashboardSummary,
} from '@/features/dashboard-v2/dashboard.types';
import { comparisonToneClasses, formatCurrency } from './utils';

interface DashboardSummaryStripProps {
  summary: DashboardSummary;
  periodSelector: ReactNode;
  loading?: boolean;
  className?: string;
}

interface MetricDefinition {
  key: DashboardMetricKey;
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  valueClassName: string;
  iconClassName: string;
}

function resolveTone(comparison?: DashboardMetricComparison): DashboardComparisonTone {
  return comparison?.tone ?? 'neutral';
}

function Comparison({ comparison }: { comparison?: DashboardMetricComparison }) {
  if (!comparison) {
    return <span className="text-xs text-slate-400 dark:text-slate-500">Sem comparação disponível</span>;
  }

  const tone = resolveTone(comparison);
  const Icon = comparison.deltaPercentage > 0
    ? ArrowUpRight
    : comparison.deltaPercentage < 0
      ? ArrowDownRight
      : Minus;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className="text-slate-400 dark:text-slate-500">{comparison.referenceLabel}</span>
      <span className={cn('inline-flex items-center gap-0.5 font-bold tabular-nums', comparisonToneClasses[tone])}>
        {comparison.deltaPercentage > 0 ? '+' : ''}{comparison.deltaPercentage.toFixed(1)}%
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(240px,auto)]">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="flex items-center gap-4 p-1" key={index}>
          <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
      <div className="border-t border-slate-200/70 pt-4 dark:border-slate-800/70 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
        <Skeleton className="h-12 w-full min-w-56 rounded-xl" />
      </div>
    </div>
  );
}

export function DashboardSummaryStrip({
  summary,
  periodSelector,
  loading = false,
  className,
}: DashboardSummaryStripProps) {
  const metrics: MetricDefinition[] = [
    {
      key: 'income',
      label: 'Receita',
      value: summary.income,
      icon: TrendingUp,
      valueClassName: 'text-emerald-600 dark:text-emerald-400',
      iconClassName: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    },
    {
      key: 'consumption',
      label: 'Consumo',
      value: summary.consumption,
      icon: TrendingDown,
      valueClassName: 'text-rose-500 dark:text-rose-400',
      iconClassName: 'border-rose-500/20 bg-rose-500/10 text-rose-500 dark:bg-rose-500/15 dark:text-rose-400',
    },
    {
      key: 'reserved',
      label: 'Reservado do período',
      value: summary.reserved,
      icon: WalletCards,
      valueClassName: 'text-emerald-600 dark:text-emerald-400',
      iconClassName: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    },
    {
      key: 'freeBalance',
      label: 'Saldo livre',
      value: summary.freeBalance,
      icon: Wallet,
      valueClassName: summary.freeBalance >= 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-rose-500 dark:text-rose-400',
      iconClassName: summary.freeBalance >= 0
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
        : 'border-rose-500/20 bg-rose-500/10 text-rose-500 dark:bg-rose-500/15 dark:text-rose-400',
    },
  ];

  return (
    <Card
      aria-busy={loading}
      className={cn('liquid-glass liquid-glass-bevel rounded-2xl border-0 shadow-sm', className)}
    >
      <CardContent className="p-4 sm:p-4">
        {loading ? (
          <SummarySkeleton />
        ) : (
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(235px,auto)] xl:items-center">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <section className="flex min-w-0 items-center gap-2.5" key={metric.key} aria-label={metric.label}>
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', metric.iconClassName)}>
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {metric.label}
                    </p>
                    <p className={cn('mt-0.5 whitespace-nowrap font-manrope text-xl font-extrabold tabular-nums 2xl:text-2xl', metric.valueClassName)}>
                      {formatCurrency(metric.value)}
                    </p>
                    <Comparison comparison={summary.comparisons?.[metric.key]} />
                  </div>
                </section>
              );
            })}

            <div className="border-t border-slate-200/70 pt-5 dark:border-slate-800/70 xl:min-w-60 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
              {periodSelector}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { DashboardSummaryStripProps };
