import { AlertTriangle, ArrowUpRight, CircleHelp, Info, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DashboardInsight, InsightPriority } from '@/features/dashboard-v2/dashboard.insights';

interface AttentionPanelProps {
  insights: DashboardInsight[];
  periodId: string;
  loading?: boolean;
  className?: string;
}

const priorityClasses: Record<InsightPriority, string> = {
  high: 'border-rose-500/20 bg-rose-500/[0.06] text-rose-600 dark:text-rose-400',
  medium: 'border-amber-500/20 bg-amber-500/[0.06] text-amber-600 dark:text-amber-400',
  low: 'border-sky-500/20 bg-sky-500/[0.06] text-sky-600 dark:text-sky-400',
};

function InsightIcon({ insight }: { insight: DashboardInsight }) {
  if (insight.kind === 'goal_risk') return <Target className="h-4 w-4" aria-hidden="true" />;
  if (insight.priority === 'high') return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
  if (insight.priority === 'medium') return <Info className="h-4 w-4" aria-hidden="true" />;
  return <CircleHelp className="h-4 w-4" aria-hidden="true" />;
}

function insightHref(insight: DashboardInsight, periodId: string) {
  if (insight.action.kind === 'filter_expenses') {
    const params = new URLSearchParams({ period: periodId });
    if (insight.action.categoryId) params.set('category', insight.action.categoryId);
    return `/despesas?${params.toString()}`;
  }

  if (insight.action.kind === 'review_reserves') return '#reservas-periodo';
  return '#metas-financeiras';
}

export function AttentionPanel({ insights, periodId, loading = false, className }: AttentionPanelProps) {
  return (
    <section className={cn('liquid-glass liquid-glass-bevel rounded-2xl p-4 sm:p-5', className)} aria-busy={loading}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-manrope text-base font-bold text-slate-800 dark:text-slate-100">O que merece atenção</h2>
            <Badge variant="outline" className="gap-1 border-brand-500/25 bg-brand-500/[0.06] text-[10px] font-semibold text-brand-700 dark:text-brand-400">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Análise local
            </Badge>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Sinais calculados com evidências dos seus próprios lançamentos.</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-3 space-y-1.5">
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-[74px] w-full rounded-xl" />)}
        </div>
      ) : insights.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
          <p className="text-sm font-semibold">Nada urgente apareceu neste período</p>
          <p className="mt-1 text-xs text-slate-400">Os sinais ficam mais úteis conforme o histórico cresce.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {insights.map(insight => (
            <article key={insight.id} className="group rounded-xl border border-slate-200/70 bg-white/40 p-2 dark:border-slate-800 dark:bg-slate-950/20">
              <div className="flex items-start gap-3">
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', priorityClasses[insight.priority])}>
                  <InsightIcon insight={insight} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">{insight.title}</h3>
                  <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{insight.description}</p>
                  <Button asChild variant="link" className="mt-0.5 h-auto min-h-5 p-0 text-[11px] font-semibold text-brand-700 dark:text-brand-400">
                    <Link to={insightHref(insight, periodId)}>
                      {insight.action.label}
                      <ArrowUpRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="sr-only">
        A futura IA poderá explicar os sinais; métricas e evidências continuarão verificáveis sem ela.
      </p>
    </section>
  );
}
