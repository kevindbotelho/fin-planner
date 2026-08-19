import { useMemo, useState } from 'react';
import { ArrowUpRight, ChevronRight, Maximize2, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CategoryAnalysisItem } from '@/features/dashboard-v2/dashboard.selectors';

interface CategoryAnalysisCardProps {
  items: CategoryAnalysisItem[];
  periodId: string;
  previousPeriodLabel?: string;
  comparisonOptions?: Array<{ id: string; label: string }>;
  comparisonPeriodId?: string;
  onComparisonPeriodChange?: (periodId: string) => void;
  loading?: boolean;
  className?: string;
}

type DisplayMode = 'value' | 'percentage';
type ExpenseTypeFilter = 'all' | 'fixed' | 'variable';

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const formatPercentage = (basisPoints: number) => `${(basisPoints / 100).toLocaleString('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})}%`;

function amountForFilter(item: CategoryAnalysisItem, filter: ExpenseTypeFilter) {
  if (filter === 'fixed') return item.fixedCents;
  if (filter === 'variable') return item.variableCents;
  return item.currentCents;
}

function ChangeLabel({ change }: { change: number | null }) {
  if (change === null) {
    return <span className="text-xs font-semibold text-slate-400">novo</span>;
  }

  const positive = change > 0;
  const negative = change < 0;

  return (
    <span className={cn(
      'text-xs font-semibold tabular-nums',
      positive && 'text-rose-500',
      negative && 'text-emerald-600 dark:text-emerald-400',
      !positive && !negative && 'text-slate-400',
    )}>
      {positive ? '+' : ''}{change.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
    </span>
  );
}

export function CategoryAnalysisCard({
  items,
  periodId,
  previousPeriodLabel,
  comparisonOptions = [],
  comparisonPeriodId,
  onComparisonPeriodChange,
  loading = false,
  className,
}: CategoryAnalysisCardProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('value');
  const [typeFilter, setTypeFilter] = useState<ExpenseTypeFilter>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(items[0]?.id ?? null);
  const [expanded, setExpanded] = useState(false);

  const filteredItems = useMemo(() => {
    const filtered = items
      .map(item => ({ item, filteredCents: amountForFilter(item, typeFilter) }))
      .filter(entry => entry.filteredCents > 0);
    const totalCents = filtered.reduce((sum, entry) => sum + entry.filteredCents, 0);

    return filtered.map(entry => ({
      ...entry,
      filteredShareBps: totalCents > 0 ? Math.round((entry.filteredCents * 10_000) / totalCents) : 0,
    }));
  }, [items, typeFilter]);

  const selected = filteredItems.find(entry => entry.item.id === selectedCategoryId) ?? filteredItems[0];
  const visibleItems = filteredItems.slice(0, 7);

  const controls = (showExpand = true) => (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-xl border border-slate-200/80 bg-white/60 p-1 dark:border-slate-800 dark:bg-slate-950/40" aria-label="Forma de exibição">
        {(['value', 'percentage'] as const).map(mode => (
          <button
            key={mode}
            type="button"
            aria-pressed={displayMode === mode}
            onClick={() => setDisplayMode(mode)}
            className={cn(
              'min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors',
              displayMode === mode
                ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
            )}
          >
            {mode === 'value' ? 'Valor' : '%'}
          </button>
        ))}
      </div>
      <Select value={typeFilter} onValueChange={(value: ExpenseTypeFilter) => setTypeFilter(value)}>
        <SelectTrigger className="h-11 w-[170px] rounded-xl text-xs font-semibold" aria-label="Filtrar despesas por tipo">
          <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Fixo e variável</SelectItem>
          <SelectItem value="fixed">Somente fixo</SelectItem>
          <SelectItem value="variable">Somente variável</SelectItem>
        </SelectContent>
      </Select>
      {showExpand ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-xl"
          aria-label="Expandir análise de categorias"
          onClick={() => setExpanded(true)}
        >
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );

  const list = (limit?: number) => {
    const entries = typeof limit === 'number' ? filteredItems.slice(0, limit) : filteredItems;
    const maxCents = Math.max(...entries.map(entry => entry.filteredCents), 1);

    return (
      <div className="space-y-1" role="list" aria-label="Gastos por categoria">
        {entries.map(({ item, filteredCents, filteredShareBps }) => (
          <button
            key={item.id}
            type="button"
            role="listitem"
            onClick={() => setSelectedCategoryId(item.id)}
            className={cn(
              'grid min-h-[58px] w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              selected?.item.id === item.id
                ? 'border-brand-500/45 bg-brand-500/[0.06]'
                : 'border-transparent hover:border-slate-200 hover:bg-white/50 dark:hover:border-slate-800 dark:hover:bg-slate-950/30',
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
                <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{item.name}</span>
              </div>
              <Progress
                value={(filteredCents / maxCents) * 100}
                className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-900"
                indicatorStyle={{ backgroundColor: item.color }}
                aria-label={`${item.name}: ${formatCurrency(filteredCents)}`}
              />
            </div>
            <div className="min-w-[92px] text-right">
              <p className="text-sm font-bold tabular-nums text-slate-700 dark:text-slate-100">
                {displayMode === 'value' ? formatCurrency(filteredCents) : formatPercentage(filteredShareBps)}
              </p>
              <p className="text-[11px] tabular-nums text-slate-400">
                {displayMode === 'value' ? formatPercentage(filteredShareBps) : formatCurrency(filteredCents)}
              </p>
            </div>
            <div className="flex min-w-[70px] items-center justify-end gap-2">
              <ChangeLabel change={item.changePercent} />
              <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </div>
          </button>
        ))}
      </div>
    );
  };

  const detail = selected ? (
    <div className="rounded-2xl border border-brand-500/25 bg-white/55 p-4 dark:bg-slate-950/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Categoria em foco</p>
          <h3 className="mt-1 font-manrope text-lg font-bold text-slate-800 dark:text-slate-100">{selected.item.name}</h3>
        </div>
        <div className="text-right">
          <p className="font-manrope text-lg font-bold tabular-nums">{formatCurrency(selected.filteredCents)}</p>
          <p className="text-xs text-slate-400">{formatPercentage(selected.filteredShareBps)} do consumo</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">Subcategorias</p>
          <div className="space-y-2">
            {selected.item.subcategories.slice(0, 5).map(subcategory => (
              <div key={subcategory.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-slate-600 dark:text-slate-300">{subcategory.name}</span>
                <span className="font-semibold tabular-nums">{formatCurrency(subcategory.currentCents)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">Lançamentos que explicam</p>
          <div className="space-y-2">
            {selected.item.subcategories
              .flatMap(subcategory => subcategory.transactions)
              .filter(transaction => typeFilter === 'all' || transaction.type === typeFilter)
              .sort((a, b) => b.amountCents - a.amountCents)
              .slice(0, 4)
              .map(transaction => (
                <div key={transaction.id} className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-slate-200/70 px-3 py-2 dark:border-slate-800">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{transaction.description}</p>
                    <p className="text-[11px] text-slate-400">{transaction.subcategoryName}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-brand-700 dark:text-brand-400">
                    {formatCurrency(transaction.amountCents)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <Button asChild variant="outline" className="mt-5 w-full rounded-xl border-brand-500/40 text-brand-700 dark:text-brand-400">
        <Link to={`/despesas?period=${encodeURIComponent(periodId)}&category=${encodeURIComponent(selected.item.id)}${typeFilter === 'all' ? '' : `&type=${typeFilter}`}`}>
          Abrir em Despesas
          <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  ) : null;

  if (loading) {
    return (
      <section className={cn('liquid-glass liquid-glass-bevel rounded-2xl p-5', className)} aria-label="Carregando análise de categorias">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-14 w-full rounded-xl" />)}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={cn('liquid-glass liquid-glass-bevel rounded-2xl p-4 sm:p-5', className)}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="font-manrope text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Para onde está indo o seu dinheiro?</h2>
            <p className="mt-1 text-xs text-slate-500">Consumo da fatura por categoria e os lançamentos que mais impactam o período.</p>
            {comparisonPeriodId && comparisonOptions.length > 0 && onComparisonPeriodChange ? (
              <Select value={comparisonPeriodId} onValueChange={onComparisonPeriodChange}>
                <SelectTrigger className="mt-2 h-9 w-[210px] rounded-xl text-[11px] font-semibold" aria-label="Selecionar período de comparação">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {comparisonOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>Comparar com: {option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : previousPeriodLabel ? (
              <p className="mt-1 text-[11px] text-slate-400">Comparação com {previousPeriodLabel}</p>
            ) : null}
          </div>
          {controls()}
        </div>

        {visibleItems.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
            <p className="text-sm font-semibold">Nenhum consumo nesta visão</p>
            <p className="mt-1 text-xs text-slate-400">Reservas do período aparecem em um card separado.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            {list(7)}
            {detail}
          </div>
        )}

        {filteredItems.length > 7 ? (
          <button type="button" onClick={() => setExpanded(true)} className="mt-4 min-h-11 w-full border-t border-slate-200 pt-3 text-xs font-semibold text-brand-700 hover:text-brand-600 dark:border-slate-800 dark:text-brand-400">
            Ver todas as categorias ({filteredItems.length})
          </button>
        ) : null}
      </section>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-manrope text-xl">Análise completa por categoria</DialogTitle>
            <DialogDescription>Explore categoria, subcategoria e lançamentos sem perder o contexto da fatura.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-wrap justify-end gap-2">{controls(false)}</div>
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
            {list()}
            {detail}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
