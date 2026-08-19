import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DailyConsumptionPoint } from '@/features/dashboard-v2/dashboard.selectors';

export interface PeriodEvolutionPoint {
  id: string;
  label: string;
  consumptionCents: number;
  reservesCents: number;
  incomeCents: number;
}

interface FinancialEvolutionCardProps {
  periods: PeriodEvolutionPoint[];
  daily: DailyConsumptionPoint[];
  loading?: boolean;
  className?: string;
}

type ViewMode = 'periods' | 'daily';
type Range = 3 | 6 | 12;

const chartConfig = {
  consumption: { label: 'Consumo', color: '#f43f5e' },
  launched: { label: 'Lançado até hoje', color: '#10b981' },
  forecast: { label: 'Previsto após hoje', color: '#94a3b8' },
} satisfies ChartConfig;

const compactCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(value / 100);

export function FinancialEvolutionCard({ periods, daily, loading = false, className }: FinancialEvolutionCardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('periods');
  const [range, setRange] = useState<Range>(6);

  const visiblePeriods = useMemo(() => periods.slice(-range), [periods, range]);
  const periodChart = visiblePeriods.map(point => ({
    ...point,
    consumption: point.consumptionCents,
  }));
  const dailyChart = daily.map(point => ({
    ...point,
    launched: point.launchedCents,
    forecast: point.forecastCents,
  }));

  if (loading) {
    return (
      <section className={cn('liquid-glass liquid-glass-bevel rounded-2xl p-5', className)} aria-label="Carregando evolução do consumo">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="mt-5 h-52 w-full rounded-xl" />
      </section>
    );
  }

  return (
    <section className={cn('liquid-glass liquid-glass-bevel rounded-2xl p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-manrope text-base font-bold text-slate-800 dark:text-slate-100">Evolução do consumo</h2>
          <p className="mt-1 text-[11px] text-slate-400">
            {viewMode === 'periods' ? 'Compare o consumo conhecido entre faturas.' : 'Veja lançamentos conhecidos por dia da fatura.'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex rounded-xl border border-slate-200 bg-white/50 p-1 dark:border-slate-800 dark:bg-slate-950/30">
            {(['periods', 'daily'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                aria-pressed={viewMode === mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'min-h-7 rounded-lg px-2 text-[10px] font-semibold transition-colors',
                  viewMode === mode ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300' : 'text-slate-500',
                )}
              >
                {mode === 'periods' ? 'Períodos' : 'Diário'}
              </button>
            ))}
          </div>
          {viewMode === 'periods' ? (
            <div className="flex rounded-xl border border-slate-200 bg-white/50 p-1 dark:border-slate-800 dark:bg-slate-950/30" aria-label="Quantidade de períodos">
              {([3, 6, 12] as const).map(value => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={range === value}
                  onClick={() => setRange(value)}
                  className={cn(
                    'min-h-7 min-w-8 rounded-lg px-1.5 text-[10px] font-semibold transition-colors',
                    range === value ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300' : 'text-slate-500',
                  )}
                >
                  {value}M
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-2 h-[140px]">
        {viewMode === 'periods' ? (
          periodChart.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
              <AreaChart data={periodChart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} />
                <YAxis tickLine={false} axisLine={false} fontSize={10} tickFormatter={compactCurrency} width={58} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => (
                  <span className="font-mono font-semibold tabular-nums">{compactCurrency(Number(value))}</span>
                )} />} />
                <Area
                  type="monotone"
                  dataKey="consumption"
                  stroke="var(--color-consumption)"
                  fill="var(--color-consumption)"
                  fillOpacity={0.12}
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ChartContainer>
          ) : <EmptyChart />
        ) : dailyChart.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
            <BarChart data={dailyChart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={9} interval="preserveStartEnd" minTickGap={26} />
              <YAxis tickLine={false} axisLine={false} fontSize={10} tickFormatter={compactCurrency} width={58} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => (
                <span className="font-mono font-semibold tabular-nums">{compactCurrency(Number(value))}</span>
              )} />} />
              <Bar dataKey="launched" stackId="known" fill="var(--color-launched)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="forecast" stackId="known" fill="var(--color-forecast)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        ) : <EmptyChart />}
      </div>

      <table className="sr-only">
        <caption>{viewMode === 'periods' ? 'Consumo por período' : 'Consumo por dia'}</caption>
        <thead><tr><th>Período</th><th>Valor</th></tr></thead>
        <tbody>
          {viewMode === 'periods'
            ? visiblePeriods.map(point => <tr key={point.id}><td>{point.label}</td><td>{compactCurrency(point.consumptionCents)}</td></tr>)
            : daily.map(point => <tr key={point.date}><td>{point.label}</td><td>{compactCurrency(point.launchedCents + point.forecastCents)}</td></tr>)}
        </tbody>
      </table>
    </section>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-center dark:border-slate-700">
      <div>
        <p className="text-sm font-semibold">Ainda não há série suficiente</p>
        <p className="mt-1 text-xs text-slate-400">Os próximos períodos aparecerão aqui automaticamente.</p>
      </div>
    </div>
  );
}
