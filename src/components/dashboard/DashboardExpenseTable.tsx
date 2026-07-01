import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Expense, Category } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardExpenseTableProps {
  expenses: Expense[];
  categories: Category[];
  totalIncome: number;
}

export function DashboardExpenseTable({ expenses, categories, totalIncome }: DashboardExpenseTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubcategory, setFilterSubcategory] = useState<string>('all');
  const [filterBank, setFilterBank] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(`${dateString}T12:00:00`), 'dd/MM/yyyy');
  };

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    if (searchTerm) {
      result = result.filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (filterSubcategory !== 'all') {
      result = result.filter(e => e.subcategoryId === filterSubcategory);
    }
    if (filterBank !== 'all') {
      if (filterBank === 'None') {
        result = result.filter(e => !e.bankOrigin);
      } else {
        result = result.filter(e => e.bankOrigin === filterBank);
      }
    }
    if (filterCategory !== 'all') {
      result = result.filter(e => e.categoryId === filterCategory);
    }
    if (filterType !== 'all') {
      result = result.filter(e => e.type === filterType);
    }
    // Sort by date descending
    result.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
    return result;
  }, [expenses, searchTerm, filterSubcategory, filterBank, filterCategory, filterType]);

  const hasActiveFilters = searchTerm || filterSubcategory !== 'all' || filterBank !== 'all' || filterCategory !== 'all' || filterType !== 'all';
  const clearFilters = () => {
    setSearchTerm('');
    setFilterSubcategory('all');
    setFilterBank('all');
    setFilterCategory('all');
    setFilterType('all');
  };

  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

  const availableSubcategories = useMemo(() => {
    if (filterCategory === 'all') return [];
    const category = categories.find(c => c.id === filterCategory);
    if (!category) return [];
    
    const usedSubcategoryIds = new Set(
      expenses
        .filter(e => e.categoryId === filterCategory && e.subcategoryId)
        .map(e => e.subcategoryId)
    );
    return category.subcategories.filter(sub => usedSubcategoryIds.has(sub.id));
  }, [expenses, filterCategory, categories]);

  if (expenses.length === 0) {
    return null;
  }

  return (
    <Card className="liquid-glass liquid-glass-bevel border-0 shadow-sm rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100">Últimas Despesas</CardTitle>
          </div>

          <div className="flex flex-wrap items-end gap-3 w-full">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar despesa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 liquid-glass border-slate-200 dark:border-slate-800 focus-visible:ring-brand-500 rounded-xl text-xs font-semibold w-full"
              />
            </div>
            
            <div className="space-y-1 w-[160px]">
              <Select value={filterBank} onValueChange={setFilterBank}>
                <SelectTrigger className="h-9 liquid-glass border-white/80 dark:border-white/10 text-xs font-manrope font-semibold text-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-200/40 dark:hover:bg-white/10 hover:border-white dark:hover:border-white/20 shadow-sm transition-all duration-300 px-4">
                  <SelectValue placeholder="Banco" />
                </SelectTrigger>
                <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-md p-1.5">
                  <SelectItem value="all" className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-full py-2 pl-9 pr-4 text-xs outline-none transition-all duration-200 border my-1",
                    filterBank === 'all'
                      ? "bg-white/40 dark:bg-white/5 border-white/80 dark:border-white/10 text-slate-800 dark:text-white font-bold shadow-sm"
                      : "bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
                    "focus:bg-white/80 dark:focus:bg-white/15 focus:border-white dark:focus:border-white/20 focus:text-slate-950 dark:focus:text-white focus:shadow-md focus:backdrop-blur-md"
                  )}>Todos os Bancos</SelectItem>
                  <SelectItem value="Nubank" className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-full py-2 pl-9 pr-4 text-xs outline-none transition-all duration-200 border my-1",
                    filterBank === 'Nubank'
                      ? "bg-white/40 dark:bg-white/5 border-white/80 dark:border-white/10 text-slate-800 dark:text-white font-bold shadow-sm"
                      : "bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
                    "focus:bg-white/80 dark:focus:bg-white/15 focus:border-white dark:focus:border-white/20 focus:text-slate-950 dark:focus:text-white focus:shadow-md focus:backdrop-blur-md"
                  )}>Nubank</SelectItem>
                  <SelectItem value="Inter" className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-full py-2 pl-9 pr-4 text-xs outline-none transition-all duration-200 border my-1",
                    filterBank === 'Inter'
                      ? "bg-white/40 dark:bg-white/5 border-white/80 dark:border-white/10 text-slate-800 dark:text-white font-bold shadow-sm"
                      : "bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
                    "focus:bg-white/80 dark:focus:bg-white/15 focus:border-white dark:focus:border-white/20 focus:text-slate-950 dark:focus:text-white focus:shadow-md focus:backdrop-blur-md"
                  )}>Inter</SelectItem>
                  <SelectItem value="None" className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-full py-2 pl-9 pr-4 text-xs outline-none transition-all duration-200 border my-1",
                    filterBank === 'None'
                      ? "bg-white/40 dark:bg-white/5 border-white/80 dark:border-white/10 text-slate-800 dark:text-white font-bold shadow-sm"
                      : "bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
                    "focus:bg-white/80 dark:focus:bg-white/15 focus:border-white dark:focus:border-white/20 focus:text-slate-950 dark:focus:text-white focus:shadow-md focus:backdrop-blur-md"
                  )}>Sem Banco</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 w-[150px]">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9 liquid-glass border-white/80 dark:border-white/10 text-xs font-manrope font-semibold text-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-200/40 dark:hover:bg-white/10 hover:border-white dark:hover:border-white/20 shadow-sm transition-all duration-300 px-4">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-md p-1.5">
                  <SelectItem value="all" className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-full py-2 pl-9 pr-4 text-xs outline-none transition-all duration-200 border my-1",
                    filterType === 'all'
                      ? "bg-white/40 dark:bg-white/5 border-white/80 dark:border-white/10 text-slate-800 dark:text-white font-bold shadow-sm"
                      : "bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
                    "focus:bg-white/80 dark:focus:bg-white/15 focus:border-white dark:focus:border-white/20 focus:text-slate-950 dark:focus:text-white focus:shadow-md focus:backdrop-blur-md"
                  )}>Todos os Tipos</SelectItem>
                  <SelectItem value="fixed" className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-full py-2 pl-9 pr-4 text-xs outline-none transition-all duration-200 border my-1",
                    filterType === 'fixed'
                      ? "bg-white/40 dark:bg-white/5 border-white/80 dark:border-white/10 text-slate-800 dark:text-white font-bold shadow-sm"
                      : "bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
                    "focus:bg-white/80 dark:focus:bg-white/15 focus:border-white dark:focus:border-white/20 focus:text-slate-950 dark:focus:text-white focus:shadow-md focus:backdrop-blur-md"
                  )}>Fixa</SelectItem>
                  <SelectItem value="variable" className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-full py-2 pl-9 pr-4 text-xs outline-none transition-all duration-200 border my-1",
                    filterType === 'variable'
                      ? "bg-white/40 dark:bg-white/5 border-white/80 dark:border-white/10 text-slate-800 dark:text-white font-bold shadow-sm"
                      : "bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
                    "focus:bg-white/80 dark:focus:bg-white/15 focus:border-white dark:focus:border-white/20 focus:text-slate-950 dark:focus:text-white focus:shadow-md focus:backdrop-blur-md"
                  )}>Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 w-[165px]">
              <Select 
                value={filterCategory} 
                onValueChange={(val) => {
                  setFilterCategory(val);
                  setFilterSubcategory('all');
                }}
              >
                <SelectTrigger className="h-9 liquid-glass border-white/80 dark:border-white/10 text-xs font-manrope font-semibold text-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-200/40 dark:hover:bg-white/10 hover:border-white dark:hover:border-white/20 shadow-sm transition-all duration-300 px-4">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-md p-1.5">
                  <SelectItem value="all" className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-full py-2 pl-9 pr-4 text-xs outline-none transition-all duration-200 border my-1",
                    filterCategory === 'all'
                      ? "bg-white/40 dark:bg-white/5 border-white/80 dark:border-white/10 text-slate-800 dark:text-white font-bold shadow-sm"
                      : "bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
                    "focus:bg-white/80 dark:focus:bg-white/15 focus:border-white dark:focus:border-white/20 focus:text-slate-950 dark:focus:text-white focus:shadow-md focus:backdrop-blur-md"
                  )}>Todas Categorias</SelectItem>
                  {categories.map(category => {
                    const isSelected = filterCategory === category.id;
                    return (
                      <SelectItem 
                        key={category.id} 
                        value={category.id} 
                        className={cn(
                          "relative flex w-full cursor-pointer select-none items-center rounded-full py-2 pl-9 pr-4 text-xs outline-none transition-all duration-200 border my-1",
                          isSelected
                            ? "bg-white/40 dark:bg-white/5 border-white/80 dark:border-white/10 text-slate-800 dark:text-white font-bold shadow-sm"
                            : "bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
                          "focus:bg-white/80 dark:focus:bg-white/15 focus:border-white dark:focus:border-white/20 focus:text-slate-950 dark:focus:text-white focus:shadow-md focus:backdrop-blur-md"
                        )}
                      >
                        {category.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1 w-[195px]">
              <Select 
                value={filterSubcategory} 
                onValueChange={setFilterSubcategory}
                disabled={filterCategory === 'all'}
              >
                <SelectTrigger className="h-9 liquid-glass border-white/80 dark:border-white/10 text-xs font-manrope font-semibold text-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-200/40 dark:hover:bg-white/10 hover:border-white dark:hover:border-white/20 shadow-sm transition-all duration-300 px-4">
                  <SelectValue placeholder="Subcategoria" />
                </SelectTrigger>
                <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-md p-1.5">
                  <SelectItem value="all" className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-full py-2 pl-9 pr-4 text-xs outline-none transition-all duration-200 border my-1",
                    filterSubcategory === 'all'
                      ? "bg-white/40 dark:bg-white/5 border-white/80 dark:border-white/10 text-slate-800 dark:text-white font-bold shadow-sm"
                      : "bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
                    "focus:bg-white/80 dark:focus:bg-white/15 focus:border-white dark:focus:border-white/20 focus:text-slate-950 dark:focus:text-white focus:shadow-md focus:backdrop-blur-md"
                  )}>Todas Subcategorias</SelectItem>
                  {availableSubcategories.map(sub => {
                    const isSelected = filterSubcategory === sub.id;
                    return (
                      <SelectItem 
                        key={sub.id} 
                        value={sub.id} 
                        className={cn(
                          "relative flex w-full cursor-pointer select-none items-center rounded-full py-2 pl-9 pr-4 text-xs outline-none transition-all duration-200 border my-1",
                          isSelected
                            ? "bg-white/40 dark:bg-white/5 border-white/80 dark:border-white/10 text-slate-800 dark:text-white font-bold shadow-sm"
                            : "bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
                          "focus:bg-white/80 dark:focus:bg-white/15 focus:border-white dark:focus:border-white/20 focus:text-slate-950 dark:focus:text-white focus:shadow-md focus:backdrop-blur-md"
                        )}
                      >
                        {sub.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className={cn(
                "h-9 w-9 p-0 rounded-full border transition-colors",
                hasActiveFilters
                  ? "border-slate-200 dark:border-slate-800 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer"
                  : "border-slate-200/20 dark:border-slate-800/20 text-slate-300 dark:text-slate-800/40 opacity-30 cursor-not-allowed pointer-events-none"
              )}
              title="Limpar filtros"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden bg-white/20 dark:bg-black/10 backdrop-blur-sm shadow-sm min-h-[380px]">
          <Table className="table-fixed w-full">
            <TableHeader className="bg-slate-100/50 dark:bg-slate-900/50">
              <TableRow className="border-b border-slate-200/50 dark:border-slate-800/50">
                <TableHead className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-manrope w-[10%]">Data</TableHead>
                <TableHead className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-manrope w-[45%]">Descrição</TableHead>
                <TableHead className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-manrope w-[13%]">Banco</TableHead>
                <TableHead className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-manrope w-[18%]">Categoria</TableHead>
                <TableHead className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-manrope text-right w-[14%]">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map(expense => {
                  const category = categories.find(c => c.id === expense.categoryId);
                  
                  return (
                    <TableRow key={expense.id} className="hover:bg-slate-100/40 dark:hover:bg-slate-900/40 border-b border-slate-200/50 dark:border-slate-800/50 transition-colors">
                      <TableCell className="text-[10px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {formatDate(expense.purchaseDate)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {expense.description}
                      </TableCell>
                      <TableCell>
                        {expense.bankOrigin ? (
                            <Badge className={cn(
                              "border-0 text-[10px] font-semibold rounded-md pointer-events-none px-2 py-0.5",
                              expense.bankOrigin === 'Nubank' 
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' 
                                : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                            )}>
                                {expense.bankOrigin}
                            </Badge>
                        ) : (
                            <span className="text-slate-400 dark:text-slate-600 text-xs font-mono">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category?.color || '#ccc' }}
                          />
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[120px] sm:max-w-[200px]" title={category?.name || 'Sem categoria'}>
                            {category?.name || 'Sem categoria'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold text-rose-500 dark:text-rose-400 text-right whitespace-nowrap">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                    Nenhuma despesa encontrada.
                  </TableCell>
                </TableRow>
              )}

              {/* Summary Rows */}
              <TableRow className="border-t border-slate-200 dark:border-slate-800 bg-slate-100/30 dark:bg-slate-900/30 hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-colors">
                <TableCell colSpan={4} className="text-xs font-bold uppercase tracking-wider text-emerald-500 font-manrope">
                  Receita Total do Mês
                </TableCell>
                <TableCell className="text-right text-xs font-mono font-bold text-emerald-500 whitespace-nowrap">
                  {formatCurrency(totalIncome)}
                </TableCell>
              </TableRow>
              
              <TableRow className="bg-slate-100/30 dark:bg-slate-900/30 hover:bg-slate-100/30 dark:hover:bg-slate-900/30 border-t border-slate-200/50 dark:border-slate-800/50 transition-colors">
                <TableCell colSpan={4} className="text-xs font-bold uppercase tracking-wider text-rose-500 font-manrope">
                  Total de Despesas
                </TableCell>
                <TableCell className="text-right text-xs font-mono font-bold text-rose-500 whitespace-nowrap">
                  {formatCurrency(totalExpenses)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-slate-100/50 dark:bg-slate-900/50 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
                <TableCell colSpan={4} className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100 font-manrope">
                  Saldo Final
                </TableCell>
                <TableCell className={cn(
                  "text-sm font-mono font-bold text-right whitespace-nowrap",
                  totalIncome - totalExpenses >= 0 ? 'text-emerald-500' : 'text-rose-500'
                )}>
                  {formatCurrency(totalIncome - totalExpenses)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
