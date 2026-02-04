import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, X } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CurrencyInput } from '@/components/ui/currency-input';
import { FixedExpenseActionDialog } from '@/components/expenses/FixedExpenseActionDialog';
import { DraggableExpenseRow } from '@/components/expenses/DraggableExpenseRow';

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
  });

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterType, setFilterType] = useState<ExpenseType | 'all'>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [filterSubcategoryId, setFilterSubcategoryId] = useState<string>('all');

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editFormData, setEditFormData] = useState({
    description: '',
    amount: '',
    purchaseDate: '',
    categoryId: '',
    subcategoryId: '',
    type: 'variable' as ExpenseType,
  });

  // Fixed expense action dialog state
  const [fixedActionDialog, setFixedActionDialog] = useState<{
    open: boolean;
    actionType: 'edit' | 'delete';
    expense: Expense | null;
  }>({ open: false, actionType: 'edit', expense: null });

  const selectedCategory = data.categories.find(c => c.id === formData.categoryId);
  const editSelectedCategory = data.categories.find(c => c.id === editFormData.categoryId);
  const periodExpenses = selectedPeriodId ? getExpensesForPeriod(selectedPeriodId) : [];

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
    });

    setFormData({
      description: '',
      amount: '',
      purchaseDate: format(new Date(), 'yyyy-MM-dd'),
      categoryId: '',
      subcategoryId: '',
      type: 'variable',
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Despesas</h1>
          <p className="text-muted-foreground">Registre e gerencie suas despesas</p>
        </div>
        <BillingPeriodSelector
          periods={data.billingPeriods}
          selectedPeriodId={selectedPeriodId}
          onSelect={setSelectedPeriodId}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Nova Despesa</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  placeholder="Ex: Almoço no restaurante"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$)</Label>
                <CurrencyInput
                  value={formData.amount}
                  onChange={value => setFormData({ ...formData, amount: value })}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Data da Compra</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: ExpenseType) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixa (recorrente)</SelectItem>
                    <SelectItem value="variable">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={value => setFormData({ ...formData, categoryId: value, subcategoryId: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategoria</Label>
                <Select
                  value={formData.subcategoryId}
                  onValueChange={value => setFormData({ ...formData, subcategoryId: value })}
                  disabled={!formData.categoryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma subcategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCategory?.subcategories.map(sub => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Despesa
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex flex-row items-center justify-between mb-4">
              <CardTitle className="text-lg">Despesas do Período</CardTitle>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{hasActiveFilters ? 'Total Filtrado' : 'Total'}</p>
                <p className="text-xl font-bold text-expense">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 p-4 bg-muted/30 rounded-lg border border-border/50">
              <div className="space-y-1">
                <Label htmlFor="filter-date" className="text-xs">Data</Label>
                <Input
                  id="filter-date"
                  type="date"
                  className="h-8 text-sm"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="filter-type" className="text-xs">Tipo</Label>
                <Select
                  value={filterType}
                  onValueChange={(value: ExpenseType | 'all') => setFilterType(value)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="fixed">Fixa</SelectItem>
                    <SelectItem value="variable">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="filter-category" className="text-xs">Categoria</Label>
                <Select
                  value={filterCategoryId}
                  onValueChange={handleCategoryFilterChange}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {data.categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
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
                <Label htmlFor="filter-subcategory" className="text-xs">Subcategoria</Label>
                <Select
                  value={filterSubcategoryId}
                  onValueChange={setFilterSubcategoryId}
                  disabled={filterCategoryId === 'all'}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {availableSubcategories.map(sub => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 text-muted-foreground hover:text-foreground"
                  >
                    <X className="mr-2 h-3 w-3" />
                    Limpar Filtros
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {displayedExpenses.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {hasActiveFilters ? 'Nenhuma despesa encontrada com os filtros selecionados' : 'Nenhuma despesa registrada neste período'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
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
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => handleUpdateExpense(e, editScope)} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Input
                id="edit-description"
                value={editFormData.description}
                onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-amount">Valor (R$)</Label>
              <CurrencyInput
                value={editFormData.amount}
                onChange={value => setEditFormData({ ...editFormData, amount: value })}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-purchaseDate">Data da Compra</Label>
              <Input
                id="edit-purchaseDate"
                type="date"
                value={editFormData.purchaseDate}
                onChange={e => setEditFormData({ ...editFormData, purchaseDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-type">Tipo</Label>
              <Select
                value={editFormData.type}
                onValueChange={(value: ExpenseType) => setEditFormData({ ...editFormData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixa</SelectItem>
                  <SelectItem value="variable">Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Categoria</Label>
              <Select
                value={editFormData.categoryId}
                onValueChange={value => setEditFormData({ ...editFormData, categoryId: value, subcategoryId: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {data.categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-subcategory">Subcategoria</Label>
              <Select
                value={editFormData.subcategoryId}
                onValueChange={value => setEditFormData({ ...editFormData, subcategoryId: value })}
                disabled={!editFormData.categoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma subcategoria" />
                </SelectTrigger>
                <SelectContent>
                  {editSelectedCategory?.subcategories.map(sub => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full">
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
