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
      <SelectTrigger className="w-[260px]">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Selecione um período" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {sortedPeriods.map((period) => (
          <SelectItem key={period.id} value={period.id}>
            <div className="flex flex-col">
              <span className="font-medium">Fatura: {period.name}</span>
              <span className="text-xs text-muted-foreground">
                ({formatDate(period.startDate)} - {formatDate(period.endDate)})
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
