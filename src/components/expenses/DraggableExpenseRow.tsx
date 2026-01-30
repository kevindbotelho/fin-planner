import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GripVertical, Pencil, RepeatIcon, Trash2 } from 'lucide-react';
import { Expense, Category, Subcategory } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-muted' : ''}>
      <TableCell className="w-8 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {format(parseISO(expense.purchaseDate), 'dd/MM/yyyy', { locale: ptBR })}
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {expense.description}
          {isRecurring && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <RepeatIcon className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Despesa fixa recorrente</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={expense.type === 'fixed' ? 'default' : 'secondary'}>
          {expense.type === 'fixed' ? 'Fixa' : 'Variável'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: category?.color }}
          />
          <span className="text-sm">
            {category?.name}{subcategory ? ` / ${subcategory.name}` : ''}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right font-medium text-expense">
        {formatCurrency(expense.amount)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(expense)}
          >
            <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
          </Button>
          {isRecurring ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDelete(expense)}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDeleteConfirm(expense.id)}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}