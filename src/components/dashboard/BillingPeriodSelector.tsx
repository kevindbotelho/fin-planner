import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BillingPeriod } from '@/types/finance';
import { cn } from '@/lib/utils';

interface BillingPeriodSelectorProps {
  periods: BillingPeriod[];
  selectedPeriodId: string | null;
  onSelect: (periodId: string) => void;
}

export function BillingPeriodSelector({
  periods,
  selectedPeriodId,
  onSelect,
}: BillingPeriodSelectorProps) {
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'dd/MM', { locale: ptBR });
  };

  const sortedPeriods = [...periods].sort((a, b) => 
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  if (periods.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 px-4 py-2 text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        <span className="text-sm">Nenhum período cadastrado</span>
      </div>
    );
  }

  return (
    <Select value={selectedPeriodId || undefined} onValueChange={onSelect}>
      <SelectTrigger className="w-[260px] liquid-glass border-slate-200 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 rounded-xl h-[42px] transition-colors font-manrope font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-brand-500" />
          <SelectValue placeholder="Selecione um período" />
        </div>
      </SelectTrigger>
      <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl shadow-lg backdrop-blur-md p-1">
        {sortedPeriods.map((period) => {
          return (
            <SelectItem 
              key={period.id} 
              value={period.id}
            >
              <div className="flex flex-col items-start text-left">
                <span className="font-semibold text-xs">Fatura: {period.name}</span>
                <span className="text-[10px] opacity-75 font-mono mt-0.5">
                  ({formatDate(period.startDate)} - {formatDate(period.endDate)})
                </span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
