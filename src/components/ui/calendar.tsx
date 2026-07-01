import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-3",
        caption: "flex justify-center pt-1 relative items-center mb-1",
        caption_label: "text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 bg-transparent p-0 text-slate-400 dark:text-slate-500 hover:bg-slate-100/60 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200 rounded-full transition-all duration-200",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-slate-400 dark:text-slate-500 rounded-md w-9 font-semibold text-[0.7rem] uppercase tracking-wide",
        row: "flex w-full mt-1",
        // Sem background no cell — evita o "quadrado" atrás das bolinhas
        cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        // Sem hover da variante ghost para evitar conflito com day_selected hover
        day: "inline-flex items-center justify-center h-9 w-9 p-0 rounded-full text-xs font-normal text-slate-700 dark:text-slate-300 transition-all duration-150 aria-selected:opacity-100 hover:bg-slate-200/80 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white cursor-pointer focus:outline-none",
        day_range_end: "day-range-end",
        // !important garante que o verde vence o hover cinza do base
        day_selected:
          "!bg-brand-500 !text-white hover:!bg-brand-600 hover:!text-white font-bold shadow-sm shadow-brand-500/20",
        day_today:
          "ring-1 ring-brand-400 ring-offset-1 ring-offset-transparent text-brand-600 dark:text-brand-400 font-semibold",
        day_outside:
          "day-outside text-slate-300 dark:text-slate-600 opacity-60",
        day_disabled: "text-slate-300 dark:text-slate-600 opacity-40 cursor-not-allowed",
        day_range_middle:
          "aria-selected:bg-brand-500/10 aria-selected:text-brand-700 dark:aria-selected:text-brand-300",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

