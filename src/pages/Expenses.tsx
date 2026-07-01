import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, X, Landmark } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useFinance } from '@/contexts/FinanceContext';
import { Expense, ExpenseType } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BillingPeriodSelector } from '@/components/dashboard/BillingPeriodSelector';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CurrencyInput } from '@/components/ui/currency-input';
import { FixedExpenseActionDialog } from '@/components/expenses/FixedExpenseActionDialog';
import { DraggableExpenseRow } from '@/components/expenses/DraggableExpenseRow';
import { CategoryManagerDialog } from '@/components/expenses/CategoryManagerDialog';
import { ImportCsvButton } from '@/components/expenses/csv/ImportCsvButton';
import { Checkbox } from '@/components/ui/checkbox';

export default function Expenses() {
  const {
    data,
    addExpense,
    updateExpense,
    deleteExpense,
    updateExpensesOrder,
    getCategoryById,
    getSubcategoryById,
    getExpensesForPeriod,
    getBillingPeriodForDate,
    isFixedExpenseWithTemplate,
    selectedPeriodId,
    setSelectedPeriodId,
  } = useFinance();

  // Local state removed, using context instead

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
    categoryId: '',
    subcategoryId: '',
    type: 'variable' as ExpenseType,
    bankOrigin: 'None' as 'Nubank' | 'Inter' | 'None',
    isReserve: false,
  });

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterType, setFilterType] = useState<ExpenseType | 'all'>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [filterSubcategoryId, setFilterSubcategoryId] = useState<string>('all');
  const [showIgnored, setShowIgnored] = useState(false);

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editFormData, setEditFormData] = useState({
    description: '',
    amount: '',
    purchaseDate: '',
    categoryId: '',
    subcategoryId: '',
    type: 'variable' as ExpenseType,
    bankOrigin: 'None' as 'Nubank' | 'Inter' | 'None',
    isReserve: false,
    isIgnored: false,
  });

  // Fixed expense action dialog state
  const [fixedActionDialog, setFixedActionDialog] = useState<{
    open: boolean;
    actionType: 'edit' | 'delete';
    expense: Expense | null;
  }>({ open: false, actionType: 'edit', expense: null });

  // Category Manager Dialog State
  const [categoryDialogState, setCategoryDialogState] = useState<{
    open: boolean;
    mode: 'category' | 'subcategory';
  }>({ open: false, mode: 'category' });

  const selectedCategory = data.categories.find(c => c.id === formData.categoryId);
  const editSelectedCategory = data.categories.find(c => c.id === editFormData.categoryId);
  
  const rawPeriodExpenses = selectedPeriodId ? getExpensesForPeriod(selectedPeriodId) : [];
  const periodExpenses = useMemo(() => {
    if (showIgnored) return rawPeriodExpenses;
    return rawPeriodExpenses.filter(e => !e.isIgnored);
  }, [rawPeriodExpenses, showIgnored]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description || !formData.amount || !formData.categoryId) {
      return;
    }

    const matchingPeriod = getBillingPeriodForDate(formData.purchaseDate);
    if (!matchingPeriod) {
      alert('A data da compra não corresponde a nenhum período de fatura cadastrado.');
      return;
    }

    addExpense({
      description: formData.description,
      amount: parseFloat(formData.amount),
      purchaseDate: formData.purchaseDate,
      categoryId: formData.categoryId,
      subcategoryId: formData.subcategoryId,
      type: formData.type,
      bankOrigin: formData.isReserve ? null : (formData.bankOrigin === 'None' ? null : formData.bankOrigin),
      isReserve: formData.isReserve,
    });

    setFormData({
      description: '',
      amount: '',
      purchaseDate: format(new Date(), 'yyyy-MM-dd'),
      categoryId: '',
      subcategoryId: '',
      type: 'variable',
      bankOrigin: 'None',
      isReserve: false,
    });
  };

  const handleEdit = (expense: Expense) => {
    // If it's a fixed expense with template, show the action dialog
    if (isFixedExpenseWithTemplate(expense)) {
      setFixedActionDialog({
        open: true,
        actionType: 'edit',
        expense,
      });
      return;
    }

    // Otherwise, open the edit dialog directly
    openEditDialog(expense);
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setEditFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      purchaseDate: expense.purchaseDate,
      categoryId: expense.categoryId,
      subcategoryId: expense.subcategoryId,
      type: expense.type || 'variable',
      bankOrigin: expense.bankOrigin || 'None',
      isReserve: expense.isReserve || false,
      isIgnored: expense.isIgnored || false,
    });
  };

  const handleUpdateExpense = (e: React.FormEvent, scope: 'current' | 'future' = 'current') => {
    e.preventDefault();

    if (!editingExpense || !editFormData.description || !editFormData.amount || !editFormData.categoryId) {
      return;
    }

    const matchingPeriod = getBillingPeriodForDate(editFormData.purchaseDate);
    if (!matchingPeriod) {
      alert('A data da compra não corresponde a nenhum período de fatura cadastrado.');
      return;
    }

    updateExpense(editingExpense.id, {
      description: editFormData.description,
      amount: parseFloat(editFormData.amount),
      purchaseDate: editFormData.purchaseDate,
      categoryId: editFormData.categoryId,
      subcategoryId: editFormData.subcategoryId,
      type: editFormData.type,
      bankOrigin: editFormData.isReserve ? null : (editFormData.bankOrigin === 'None' ? null : editFormData.bankOrigin),
      isReserve: editFormData.isReserve,
      isIgnored: editFormData.isIgnored,
    }, scope);

    setEditingExpense(null);
  };

  const handleDelete = (expense: Expense) => {
    // If it's a fixed expense with template, show the action dialog
    if (isFixedExpenseWithTemplate(expense)) {
      setFixedActionDialog({
        open: true,
        actionType: 'delete',
        expense,
      });
      return;
    }

    // Otherwise, delete directly (this won't be called from UI, we use AlertDialog)
    deleteExpense(expense.id);
  };

  // Sort expenses: first by displayOrder (if set), then by date and createdAt
  const sortedExpenses = useMemo(() => {
    return [...periodExpenses].sort((a, b) => {
      // If both have displayOrder set (non-zero), use that
      if (a.displayOrder !== 0 || b.displayOrder !== 0) {
        return a.displayOrder - b.displayOrder;
      }
      // Otherwise sort by date (newest first), then by createdAt
      const dateComparison = new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
      if (dateComparison !== 0) return dateComparison;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [periodExpenses]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return sortedExpenses.filter(expense => {
      // Date filter
      if (filterDate && expense.purchaseDate !== filterDate) return false;

      // Type filter
      if (filterType !== 'all' && expense.type !== filterType) return false;

      // Category filter
      if (filterCategoryId !== 'all' && expense.categoryId !== filterCategoryId) return false;

      // Subcategory filter
      if (filterSubcategoryId !== 'all' && expense.subcategoryId !== filterSubcategoryId) return false;

      return true;
    });
  }, [sortedExpenses, filterDate, filterType, filterCategoryId, filterSubcategoryId]);

  // Computed available subcategories for the filter
  const availableSubcategories = useMemo(() => {
    if (filterCategoryId === 'all') return [];

    const category = data.categories.find(c => c.id === filterCategoryId);
    if (!category) return [];

    // Get IDs of subcategories that are actually used in the current list (sortedExpenses)
    // We look at the Period expenses to see what is launched
    const usedSubcategoryIds = new Set(
      sortedExpenses
        .filter(e => e.categoryId === filterCategoryId && e.subcategoryId)
        .map(e => e.subcategoryId)
    );

    return category.subcategories.filter(sub => usedSubcategoryIds.has(sub.id));
  }, [sortedExpenses, filterCategoryId, data.categories]);

  // Reset subcategory filter when category changes
  const handleCategoryFilterChange = (value: string) => {
    setFilterCategoryId(value);
    setFilterSubcategoryId('all');
  };

  const clearFilters = () => {
    setFilterDate('');
    setFilterType('all');
    setFilterCategoryId('all');
    setFilterSubcategoryId('all');
  };

  const hasActiveFilters = filterDate || filterType !== 'all' || filterCategoryId !== 'all' || filterSubcategoryId !== 'all';

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedExpenses.findIndex(e => e.id === active.id);
      const newIndex = sortedExpenses.findIndex(e => e.id === over.id);

      const reorderedExpenses = arrayMove(sortedExpenses, oldIndex, newIndex);
      const orderedIds = reorderedExpenses.map(e => e.id);

      await updateExpensesOrder(orderedIds);
    }
  };

  const displayedExpenses = filteredExpenses;
  const totalExpenses = displayedExpenses.reduce((acc, exp) => acc + exp.amount, 0);

  // Store the current scope for fixed expense edit
  const [editScope, setEditScope] = useState<'current' | 'future'>('current');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
        <div>
          <h1 className="text-xl font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100">Despesas</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Registre e gerencie suas despesas</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportCsvButton />
          <BillingPeriodSelector
            periods={data.billingPeriods}
            selectedPeriodId={selectedPeriodId}
            onSelect={setSelectedPeriodId}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4 items-start">
        <Card className="liquid-glass liquid-glass-bevel border-0 shadow-sm lg:col-span-1 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100">Nova Despesa</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Descrição</Label>
                <Input
                  id="description"
                  placeholder="Ex: Almoço no restaurante"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="h-9 liquid-glass border-slate-200 dark:border-slate-800 focus-visible:ring-brand-500 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Valor (R$)</Label>
                <CurrencyInput
                  value={formData.amount}
                  onChange={value => setFormData({ ...formData, amount: value })}
                  placeholder="0,00"
                  className="h-9 liquid-glass border-slate-200 dark:border-slate-800 focus-visible:ring-brand-500 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Data da Compra</Label>
                <DatePickerInput
                  value={formData.purchaseDate}
                  onChange={(val) => setFormData({ ...formData, purchaseDate: val })}
                  placeholder="Selecionar data"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="type" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: ExpenseType) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="h-[42px] w-full liquid-glass border-slate-200 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 rounded-xl transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl shadow-lg backdrop-blur-md p-1">
                    <SelectItem value="fixed">Fixa (recorrente)</SelectItem>
                    <SelectItem value="variable">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Categoria</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => {
                    if (value === 'new-category') {
                      setCategoryDialogState({ open: true, mode: 'category' });
                    } else {
                      setFormData({ ...formData, categoryId: value, subcategoryId: '' });
                    }
                  }}
                >
                  <SelectTrigger className="h-[42px] w-full liquid-glass border-slate-200 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 rounded-xl transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl shadow-lg backdrop-blur-md p-1">
                    {data.categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                    <div className="p-1 border-t border-slate-200/50 dark:border-slate-800/50 mt-1">
                      <SelectItem value="new-category" className="relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-9 pr-4 text-xs font-semibold outline-none transition-colors text-brand-500 bg-transparent focus:bg-brand-500/10 focus:text-brand-600 dark:focus:text-brand-400 focus:shadow-sm">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Nova Categoria
                        </div>
                      </SelectItem>
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subcategory" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Subcategoria</Label>
                <Select
                  value={formData.subcategoryId}
                  onValueChange={(value) => {
                    if (value === 'new-subcategory') {
                      setCategoryDialogState({ open: true, mode: 'subcategory' });
                    } else {
                      setFormData({ ...formData, subcategoryId: value });
                    }
                  }}
                  disabled={!formData.categoryId}
                >
                  <SelectTrigger className="h-[42px] w-full liquid-glass border-slate-200 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 rounded-xl transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm disabled:opacity-45 disabled:cursor-not-allowed">
                    <SelectValue placeholder="Selecione uma subcategoria" />
                  </SelectTrigger>
                  <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl shadow-lg backdrop-blur-md p-1">
                    {selectedCategory?.subcategories.map(sub => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                    <div className="p-1 border-t border-slate-200/50 dark:border-slate-800/50 mt-1">
                      <SelectItem value="new-subcategory" className="relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-9 pr-4 text-xs font-semibold outline-none transition-colors text-brand-500 bg-transparent focus:bg-brand-500/10 focus:text-brand-600 dark:focus:text-brand-400 focus:shadow-sm">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                           Nova Subcategoria
                        </div>
                      </SelectItem>
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bankOrigin" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Banco</Label>
                <Select
                  value={formData.bankOrigin}
                  onValueChange={(value: 'Nubank' | 'Inter' | 'None') => setFormData({ ...formData, bankOrigin: value })}
                >
                  <SelectTrigger className="h-[42px] w-full liquid-glass border-slate-200 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 rounded-xl transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                    <SelectValue placeholder="Selecione um banco" />
                  </SelectTrigger>
                  <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl shadow-lg backdrop-blur-md p-1">
                    <SelectItem value="None">Nenhum</SelectItem>
                    <SelectItem value="Nubank">Nubank</SelectItem>
                    <SelectItem value="Inter">Inter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start space-x-2.5 border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-3 bg-slate-100/20 dark:bg-slate-900/20 transition-all duration-200">
                <Checkbox
                  id="isReserve"
                  checked={formData.isReserve}
                  onCheckedChange={(checked) => {
                    setFormData({
                      ...formData,
                      isReserve: !!checked,
                      bankOrigin: checked ? 'None' : formData.bankOrigin,
                    });
                  }}
                  className="h-5 w-5 pointer-events-auto rounded-md border-slate-300 dark:border-slate-800 data-[state=checked]:bg-brand-500 data-[state=checked]:border-brand-500 mt-0.5"
                />
                <div className="flex-1">
                  <Label htmlFor="isReserve" className="cursor-pointer flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <Landmark className="h-3.5 w-3.5 text-brand-500" />
                    Reserva de crédito
                  </Label>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 leading-relaxed">
                    Investimento, caixa ou verba reservada (não é fatura)
                  </p>
                </div>
              </div>

              <Button type="submit" className="w-full rounded-xl h-[42px] text-xs font-semibold uppercase tracking-wider bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-500 dark:hover:bg-brand-600 dark:text-white transition-colors shadow-md shadow-brand-500/10 mt-2">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Despesa
              </Button>
            </form>
          </CardContent>
        </Card>

        <CategoryManagerDialog
          open={categoryDialogState.open}
          onOpenChange={(open) => setCategoryDialogState(prev => ({ ...prev, open }))}
          initialMode={categoryDialogState.mode}
          defaultCategoryId={formData.categoryId}
          onSuccess={(type, id) => {
            if (type === 'category') {
              setFormData(prev => ({ ...prev, categoryId: id, subcategoryId: '' }));
            } else {
              // Only set subcategory if the parent category matches (it should, but safety first)
              // If we created a subcategory for a different category (user changed it in dialog), 
              // we might want to switch the category too.
              // The createSubcategory returns the object, check context implementation
              // Since we pass defaultCategoryId, it's likely correct.
              // But if user changed category inside dialog, we need to know the category ID too.
              // Let's assume for now we stay on current category or if we can fetch it.
              // Actually, simply setting the subcategory ID might not be enough if the category ID doesn't match.
              // But our dialog defaults to current category.
              setFormData(prev => ({ ...prev, subcategoryId: id }));
            }
          }}
        />

        <Card className="liquid-glass liquid-glass-bevel border-0 shadow-sm lg:col-span-3 rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex flex-row items-center justify-between mb-4">
              <CardTitle className="text-base font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100">Despesas do Período</CardTitle>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider font-manrope">{hasActiveFilters ? 'Total Filtrado' : 'Total'}</p>
                <p className="text-lg font-extrabold text-rose-500 font-manrope mt-0.5">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 p-5 bg-slate-100/30 dark:bg-slate-900/30 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
              <div className="space-y-1 lg:col-span-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Data da Compra</Label>
                <DatePickerInput
                  value={filterDate}
                  onChange={setFilterDate}
                  placeholder="Todas as datas"
                />
              </div>

              <div className="space-y-1 lg:col-span-2">
                <Label htmlFor="filter-type" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tipo</Label>
                <Select
                  value={filterType}
                  onValueChange={(value: ExpenseType | 'all') => setFilterType(value)}
                >
                  <SelectTrigger className="h-[42px] w-full liquid-glass border-slate-200 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 rounded-xl transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl shadow-lg backdrop-blur-md p-1">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="fixed">Fixa</SelectItem>
                    <SelectItem value="variable">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 lg:col-span-3">
                <Label htmlFor="filter-category" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Categoria</Label>
                <Select
                  value={filterCategoryId}
                  onValueChange={handleCategoryFilterChange}
                >
                  <SelectTrigger className="h-[42px] w-full liquid-glass border-slate-200 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 rounded-xl transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl shadow-lg backdrop-blur-md p-1">
                    <SelectItem value="all">Todas</SelectItem>
                    {data.categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 lg:col-span-4">
                <Label htmlFor="filter-subcategory" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Subcategoria</Label>
                <Select
                  value={filterSubcategoryId}
                  onValueChange={setFilterSubcategoryId}
                  disabled={filterCategoryId === 'all'}
                >
                  <SelectTrigger className="h-[42px] w-full liquid-glass border-slate-200 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 rounded-xl transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm disabled:opacity-45 disabled:cursor-not-allowed">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl shadow-lg backdrop-blur-md p-1">
                    <SelectItem value="all">Todas</SelectItem>
                    {availableSubcategories.map(sub => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 lg:col-span-12 flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 px-1.5">
                <div className="flex items-center space-x-2.5">
                  <Checkbox
                    id="showIgnored"
                    checked={showIgnored}
                    onCheckedChange={(checked) => setShowIgnored(!!checked)}
                    className="h-5 w-5 pointer-events-auto rounded-md border-slate-300 dark:border-slate-800 data-[state=checked]:bg-brand-500 data-[state=checked]:border-brand-500"
                  />
                  <Label htmlFor="showIgnored" className="cursor-pointer text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                    Mostrar despesas desconsideradas (pontes de cartão)
                  </Label>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 px-2.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors"
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {displayedExpenses.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                {hasActiveFilters ? 'Nenhuma despesa encontrada com os filtros selecionados' : 'Nenhuma despesa registrada neste período'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200/50 dark:border-slate-800/50 bg-white/20 dark:bg-black/10 backdrop-blur-sm shadow-sm">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table>
                    <TableHeader className="bg-slate-100/50 dark:bg-slate-900/50">
                      <TableRow className="border-b border-slate-200/50 dark:border-slate-800/50">
                        <TableHead className="w-8"></TableHead>
                        <TableHead className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-manrope">Data</TableHead>
                        <TableHead className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-manrope">Descrição</TableHead>
                        <TableHead className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-manrope">Banco</TableHead>
                        <TableHead className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-manrope">Tipo</TableHead>
                        <TableHead className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-manrope">Categoria</TableHead>
                        <TableHead className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-manrope text-right">Valor</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext
                        items={displayedExpenses.map(e => e.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {displayedExpenses.map(expense => {
                          const category = getCategoryById(expense.categoryId);
                          const subcategory = getSubcategoryById(expense.categoryId, expense.subcategoryId);
                          const isRecurring = isFixedExpenseWithTemplate(expense);

                          return (
                            <DraggableExpenseRow
                              key={expense.id}
                              expense={expense}
                              category={category}
                              subcategory={subcategory}
                              isRecurring={isRecurring}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              onDeleteConfirm={(id) => deleteExpense(id)}
                              formatCurrency={formatCurrency}
                            />
                          );
                        })}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </DndContext>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto custom-scrollbar bg-white/95 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800 dark:text-slate-100 font-manrope font-bold">Editar Despesa</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => handleUpdateExpense(e, editScope)} className="space-y-3.5 mt-2">
            <div className="space-y-1">
              <Label htmlFor="edit-description" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Descrição</Label>
              <Input
                id="edit-description"
                value={editFormData.description}
                onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                className="h-9 liquid-glass border-slate-200 dark:border-slate-800 focus-visible:ring-brand-500 rounded-xl text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-amount" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Valor (R$)</Label>
              <CurrencyInput
                value={editFormData.amount}
                onChange={value => setEditFormData({ ...editFormData, amount: value })}
                placeholder="0,00"
                className="h-9 liquid-glass border-slate-200 dark:border-slate-800 focus-visible:ring-brand-500 rounded-xl text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Data da Compra</Label>
              <DatePickerInput
                value={editFormData.purchaseDate}
                onChange={(val) => setEditFormData({ ...editFormData, purchaseDate: val })}
                placeholder="Selecionar data"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-type" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tipo</Label>
              <Select
                value={editFormData.type}
                onValueChange={(value: ExpenseType) => setEditFormData({ ...editFormData, type: value })}
              >
                <SelectTrigger className="h-[42px] w-full liquid-glass border-slate-200 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 rounded-xl transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl shadow-lg backdrop-blur-md p-1">
                  <SelectItem value="fixed">Fixa</SelectItem>
                  <SelectItem value="variable">Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-category" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Categoria</Label>
              <Select
                value={editFormData.categoryId}
                onValueChange={value => setEditFormData({ ...editFormData, categoryId: value, subcategoryId: '' })}
              >
                <SelectTrigger className="h-[42px] w-full liquid-glass border-slate-200 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 rounded-xl transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl shadow-lg backdrop-blur-md p-1">
                  {data.categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-subcategory" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Subcategoria</Label>
              <Select
                value={editFormData.subcategoryId}
                onValueChange={value => setEditFormData({ ...editFormData, subcategoryId: value })}
                disabled={!editFormData.categoryId}
              >
                <SelectTrigger className="h-[42px] w-full liquid-glass border-slate-200 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 rounded-xl transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm disabled:opacity-45 disabled:cursor-not-allowed">
                  <SelectValue placeholder="Selecione uma subcategoria" />
                </SelectTrigger>
                <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl shadow-lg backdrop-blur-md p-1">
                  {editSelectedCategory?.subcategories.map(sub => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-bankOrigin" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Banco</Label>
              <Select
                value={editFormData.bankOrigin}
                onValueChange={(value: 'Nubank' | 'Inter' | 'None') => setEditFormData({ ...editFormData, bankOrigin: value })}
              >
                <SelectTrigger className="h-[42px] w-full liquid-glass border-slate-200 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 rounded-xl transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                  <SelectValue placeholder="Selecione um banco" />
                </SelectTrigger>
                <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl shadow-lg backdrop-blur-md p-1">
                  <SelectItem value="None">Nenhum</SelectItem>
                  <SelectItem value="Nubank">Nubank</SelectItem>
                  <SelectItem value="Inter">Inter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start space-x-2.5 border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-3 bg-slate-100/20 dark:bg-slate-900/20 transition-all duration-200">
              <Checkbox
                id="edit-isReserve"
                checked={editFormData.isReserve}
                onCheckedChange={(checked) => {
                  setEditFormData({
                    ...editFormData,
                    isReserve: !!checked,
                    bankOrigin: checked ? 'None' : editFormData.bankOrigin,
                  });
                }}
                className="h-5 w-5 pointer-events-auto rounded-md border-slate-300 dark:border-slate-800 data-[state=checked]:bg-brand-500 data-[state=checked]:border-brand-500 mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor="edit-isReserve" className="cursor-pointer flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <Landmark className="h-3.5 w-3.5 text-brand-500" />
                  Reserva de crédito
                </Label>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 leading-relaxed">
                  Investimento, caixa ou verba reservada (não é fatura)
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-3 bg-slate-100/20 dark:bg-slate-900/20 transition-all duration-200">
              <Checkbox
                id="edit-isIgnored"
                checked={editFormData.isIgnored}
                onCheckedChange={(checked) => {
                  setEditFormData({
                    ...editFormData,
                    isIgnored: !!checked,
                  });
                }}
                className="h-5 w-5 pointer-events-auto rounded-md border-slate-300 dark:border-slate-800 data-[state=checked]:bg-brand-500 data-[state=checked]:border-brand-500 mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor="edit-isIgnored" className="cursor-pointer flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Desconsiderar despesa (Ponte)
                </Label>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 leading-relaxed">
                  Exclui do total de despesas e dos gráficos do Dashboard
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full rounded-xl h-[42px] text-xs font-semibold uppercase tracking-wider bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-500 dark:hover:bg-brand-600 dark:text-white transition-colors shadow-md shadow-brand-500/10 mt-2">
              Salvar Alterações
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fixed Expense Action Dialog */}
      <FixedExpenseActionDialog
        open={fixedActionDialog.open}
        onOpenChange={(open) => setFixedActionDialog({ ...fixedActionDialog, open })}
        actionType={fixedActionDialog.actionType}
        onCurrentOnly={() => {
          if (!fixedActionDialog.expense) return;

          if (fixedActionDialog.actionType === 'edit') {
            setEditScope('current');
            openEditDialog(fixedActionDialog.expense);
          } else {
            deleteExpense(fixedActionDialog.expense.id, 'current');
          }
        }}
        onCurrentAndFuture={() => {
          if (!fixedActionDialog.expense) return;

          if (fixedActionDialog.actionType === 'edit') {
            setEditScope('future');
            openEditDialog(fixedActionDialog.expense);
          } else {
            deleteExpense(fixedActionDialog.expense.id, 'future');
          }
        }}
      />
    </div>
  );
}
