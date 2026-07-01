import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerInputProps {
  value: string; // "YYYY-MM-DD" format
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "Selecionar data",
  className,
  disabled,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    const parsed = parse(value, "yyyy-MM-dd", new Date());
    return isValid(parsed) ? parsed : undefined;
  }, [value]);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, "yyyy-MM-dd"));
      setOpen(false);
    } else {
      onChange("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "h-9 w-full flex items-center gap-2 px-3 liquid-glass border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-left transition-all duration-200",
            "hover:bg-slate-100/40 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/20",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1",
            selectedDate
              ? "text-slate-700 dark:text-slate-200"
              : "text-slate-400 dark:text-slate-500",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-400" />
          <span className="truncate">
            {selectedDate
              ? format(selectedDate, "dd 'de' MMM. yyyy", { locale: ptBR })
              : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 liquid-glass border border-white/60 dark:border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden"
        align="start"
        sideOffset={8}
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          locale={ptBR}
          initialFocus
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  );
}
