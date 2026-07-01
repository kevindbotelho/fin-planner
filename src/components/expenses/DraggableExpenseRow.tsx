import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GripVertical, Pencil, RepeatIcon, Trash2, Landmark } from 'lucide-react';
import { Expense, Category, Subcategory } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface DraggableExpenseRowProps {
  expense: Expense;
  category: Category | undefined;
  subcategory: Subcategory | undefined;
  isRecurring: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onDeleteConfirm: (id: string) => void;
  formatCurrency: (value: number) => string;
}

export function DraggableExpenseRow({
  expense,
  category,
  subcategory,
  isRecurring,
  onEdit,
  onDelete,
  onDeleteConfirm,
  formatCurrency,
}: DraggableExpenseRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: expense.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : (expense.isIgnored ? 0.4 : 1),
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={cn(
      isDragging ? 'bg-slate-100/50 dark:bg-slate-900/50' : 'hover:bg-slate-100/40 dark:hover:bg-slate-900/40 transition-colors border-b border-slate-200/50 dark:border-slate-800/50'
    )}>
      <TableCell className="w-8 cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-700 hover:text-slate-500" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </TableCell>
      <TableCell className="text-[10px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap">
        {format(parseISO(expense.purchaseDate), 'dd/MM/yyyy', { locale: ptBR })}
      </TableCell>
      <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-200">
        <div className="flex items-center gap-2">
          <span className={expense.isIgnored ? 'line-through text-slate-400 dark:text-slate-600' : ''}>
            {expense.description}
          </span>
          {isRecurring && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <RepeatIcon className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                </TooltipTrigger>
                <TooltipContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                  <p>Despesa fixa recorrente</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell>
        {expense.isIgnored ? (
            <Badge className="bg-slate-100 text-slate-400 border-0 dark:bg-slate-900/40 dark:text-slate-600 text-[10px] font-semibold rounded-md pointer-events-none px-2 py-0.5">
                Ponte (Ignorada)
            </Badge>
        ) : expense.bankOrigin ? (
            <Badge className={cn(
              "border-0 text-[10px] font-semibold rounded-md pointer-events-none px-2 py-0.5",
              expense.bankOrigin === 'Nubank' 
                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' 
                : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
            )}>
                {expense.bankOrigin}
            </Badge>
        ) : expense.isReserve ? (
            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0 text-[10px] font-semibold rounded-md pointer-events-none px-2 py-0.5 flex items-center gap-1 w-fit">
                <Landmark className="h-3 w-3" />
                Reserva
            </Badge>
        ) : (
            <span className="text-slate-400 dark:text-slate-600 text-xs font-mono">—</span>
        )}
      </TableCell>
      <TableCell>
        <Badge className={cn(
          "border-0 text-[10px] font-semibold rounded-md pointer-events-none px-2 py-0.5 hover:bg-opacity-10",
          expense.type === 'fixed' 
            ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400' 
            : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400'
        )}>
          {expense.type === 'fixed' ? 'Fixa' : 'Variável'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: category?.color }}
          />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {category?.name}{subcategory ? ` / ${subcategory.name}` : ''}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-xs font-mono font-bold text-rose-500 dark:text-rose-400 text-right whitespace-nowrap">
        {formatCurrency(expense.amount)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-brand-500 dark:hover:text-brand-400 rounded-full hover:bg-slate-100/50 dark:hover:bg-slate-900/50"
            onClick={() => onEdit(expense)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {isRecurring ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 rounded-full hover:bg-rose-50/50 dark:hover:bg-rose-950/20"
              onClick={() => onDelete(expense)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 rounded-full hover:bg-rose-50/50 dark:hover:bg-rose-950/20">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm bg-white/95 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-md">
                <DialogHeader>
                  <DialogTitle className="text-slate-800 dark:text-slate-100 font-manrope font-bold text-sm">Excluir despesa?</DialogTitle>
                  <DialogDescription className="text-slate-500 dark:text-slate-300 text-xs mt-1">
                    Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4 flex flex-row justify-end gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" className="rounded-xl h-[38px] text-xs font-semibold uppercase tracking-wider border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button 
                      className="rounded-xl h-[38px] text-xs font-semibold uppercase tracking-wider bg-rose-500 text-white hover:bg-rose-600 dark:bg-rose-500 dark:text-white dark:hover:bg-rose-600 transition-colors shadow-md shadow-rose-500/10" 
                      onClick={() => onDeleteConfirm(expense.id)}
                    >
                      Excluir
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}