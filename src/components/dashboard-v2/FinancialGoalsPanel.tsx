import { ChevronRight, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { FinancialGoalItem } from '@/features/dashboard-v2/dashboard.types';
import { clampPercentage, formatCurrency, goalStatusClasses, goalStatusTextClasses } from './utils';

interface FinancialGoalsPanelProps {
  goals: FinancialGoalItem[];
  loading?: boolean;
  onViewAll?: () => void;
  onSelectGoal?: (goal: FinancialGoalItem) => void;
  className?: string;
}

function GoalsSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="space-y-2.5" key={index}>
          <div className="flex justify-between gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function FinancialGoalsPanel({
  goals,
  loading = false,
  onViewAll,
  onSelectGoal,
  className,
}: FinancialGoalsPanelProps) {
  return (
    <Card aria-busy={loading} className={cn('liquid-glass liquid-glass-bevel flex h-full flex-col rounded-2xl border-0 shadow-sm', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
        <CardTitle className="flex items-center gap-2 font-manrope text-base font-bold text-slate-800 dark:text-slate-100">
          <Target aria-hidden="true" className="h-4.5 w-4.5 text-brand-500" />
          Metas financeiras
        </CardTitle>
        {onViewAll && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="h-9 rounded-xl px-3 text-xs font-semibold text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
          >
            Ver todas
            <ChevronRight aria-hidden="true" className="ml-1 h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        {loading ? (
          <GoalsSkeleton />
        ) : goals.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/80 px-5 py-8 text-center dark:border-slate-800/80">
            <Target aria-hidden="true" className="h-7 w-7 text-slate-300 dark:text-slate-700" />
            <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Nenhuma meta definida</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400 dark:text-slate-500">
              Quando uma meta for cadastrada, o acompanhamento do período aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {goals.map((goal) => {
              const content = (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{goal.label}</span>
                        {goal.scopeLabel && (
                          <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                            {goal.scopeLabel}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs tabular-nums text-slate-400 dark:text-slate-500">
                        {formatCurrency(goal.spent)} de {formatCurrency(goal.limit)}
                      </p>
                    </div>
                    <span className={cn('text-sm font-extrabold tabular-nums', goalStatusTextClasses[goal.status])}>
                      {goal.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <Progress
                    aria-label={`${goal.label}: ${goal.percentage.toFixed(0)}% da meta utilizada`}
                    value={clampPercentage(goal.percentage)}
                    className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/70"
                    indicatorClassName={cn('rounded-full', goalStatusClasses[goal.status])}
                  />
                </>
              );

              return onSelectGoal ? (
                <button
                  type="button"
                  key={goal.id}
                  onClick={() => onSelectGoal(goal)}
                  className="w-full rounded-xl border border-transparent p-3 text-left transition-colors hover:border-slate-200/70 hover:bg-slate-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:hover:border-slate-800 dark:hover:bg-slate-900/50 dark:focus-visible:ring-offset-slate-950"
                >
                  {content}
                </button>
              ) : (
                <div className="rounded-xl p-3" key={goal.id}>{content}</div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { FinancialGoalsPanelProps };
