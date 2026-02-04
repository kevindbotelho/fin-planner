import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil, Check, X, Save } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ColorPicker } from '@/components/ui/color-picker';
import { CurrencyInput } from '@/components/ui/currency-input';

const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const YEARS = ['2026'];

const DAYS = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'periods';

  const {
    data,
    addBillingPeriod,
    updateBillingPeriod,
    deleteBillingPeriod,
    setMonthlyIncome,
    getIncomeForPeriod,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    seedDefaultCategories,
    setCategoryGoal,
  } = useFinance();

  const onTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // Billing Period Form
  const [periodForm, setPeriodForm] = useState({
    month: '',
    year: '2026',
    startDay: '01',
    startMonth: '01',
    endDay: '30',
    endMonth: '01',
  });

  // Edit Period State
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [editPeriodForm, setEditPeriodForm] = useState({
    month: '',
    year: '2026',
    startDay: '',
    startMonth: '',
    endDay: '',
    endMonth: '',
  });

  // Income Form
  const [incomeForm, setIncomeForm] = useState<{ [key: string]: { salary: string; extra: string } }>({});

  // Category Form
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#10b981' });
  const [subcategoryForms, setSubcategoryForms] = useState<{ [key: string]: string }>({});
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  // Goals State
  const [goalForms, setGoalForms] = useState<{ [key: string]: string }>({});

  // Edit Category State
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryForm, setEditCategoryForm] = useState({ name: '', color: '' });

  // Edit Subcategory State
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [editSubcategoryName, setEditSubcategoryName] = useState('');

  // Removed auto-seed useEffect - seeding now handled in FinanceContext with user_settings flag

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Initialize goal forms
  useEffect(() => {
    const goals: { [key: string]: string } = {};
    data.categories.forEach(cat => {
      const goal = data.goals.find(g => g.categoryId === cat.id);
      goals[cat.id] = goal ? goal.amount.toFixed(2) : '';
    });
    setGoalForms(goals);
  }, [data.categories, data.goals]);

  const handleSaveGoal = async (categoryId: string) => {
    const amountStr = goalForms[categoryId];
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) return;
    await setCategoryGoal(categoryId, amount);
  };

  const getMonthName = (monthValue: string) => {
    return MONTHS.find(m => m.value === monthValue)?.label || monthValue;
  };

  const getDaysInMonth = (month: string, year: string) => {
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  };

  const handleAddPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodForm.month || !periodForm.year) return;

    const monthName = getMonthName(periodForm.month);
    const startDate = `${periodForm.year}-${periodForm.startMonth}-${periodForm.startDay.padStart(2, '0')}`;

    // Calculate end year (if end month < start month, it's next year)
    const endYear = parseInt(periodForm.endMonth) < parseInt(periodForm.startMonth)
      ? (parseInt(periodForm.year) + 1).toString()
      : periodForm.year;
    const endDate = `${endYear}-${periodForm.endMonth}-${periodForm.endDay.padStart(2, '0')}`;

    addBillingPeriod({
      name: `${monthName} ${periodForm.year}`,
      startDate,
      endDate,
    });

    setPeriodForm({ month: '', year: '2026', startDay: '01', startMonth: '01', endDay: '30', endMonth: '01' });
  };

  const handleStartEditPeriod = (period: typeof data.billingPeriods[0]) => {
    const startDate = parseISO(period.startDate);
    const endDate = parseISO(period.endDate);
    setEditingPeriodId(period.id);
    setEditPeriodForm({
      month: (startDate.getMonth() + 1).toString().padStart(2, '0'),
      year: startDate.getFullYear().toString(),
      startDay: startDate.getDate().toString().padStart(2, '0'),
      startMonth: (startDate.getMonth() + 1).toString().padStart(2, '0'),
      endDay: endDate.getDate().toString().padStart(2, '0'),
      endMonth: (endDate.getMonth() + 1).toString().padStart(2, '0'),
    });
  };

  const handleSaveEditPeriod = (periodId: string) => {
    const monthName = getMonthName(editPeriodForm.month);
    const startDate = `${editPeriodForm.year}-${editPeriodForm.startMonth}-${editPeriodForm.startDay.padStart(2, '0')}`;

    // Calculate end year (if end month < start month, it's next year)
    const endYear = parseInt(editPeriodForm.endMonth) < parseInt(editPeriodForm.startMonth)
      ? (parseInt(editPeriodForm.year) + 1).toString()
      : editPeriodForm.year;
    const endDate = `${endYear}-${editPeriodForm.endMonth}-${editPeriodForm.endDay.padStart(2, '0')}`;

    updateBillingPeriod(periodId, {
      name: `${monthName} ${editPeriodForm.year}`,
      startDate,
      endDate,
    });

    setEditingPeriodId(null);
  };

  const handleSaveIncome = (periodId: string) => {
    const form = incomeForm[periodId];
    if (!form) return;

    setMonthlyIncome(
      periodId,
      parseFloat(form.salary) || 0,
      parseFloat(form.extra) || 0
    );
  };

  const getIncomeFormValues = (periodId: string) => {
    if (incomeForm[periodId]) return incomeForm[periodId];
    const existing = getIncomeForPeriod(periodId);
    return {
      salary: existing?.salary?.toString() || '',
      extra: existing?.extra?.toString() || '',
    };
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) return;
    addCategory({ name: categoryForm.name, color: categoryForm.color });
    setCategoryForm({ name: '', color: '#10b981' });
  };

  const handleStartEditCategory = (category: typeof data.categories[0]) => {
    setEditingCategoryId(category.id);
    setEditCategoryForm({ name: category.name, color: category.color });
  };

  const handleSaveEditCategory = (categoryId: string) => {
    updateCategory(categoryId, { name: editCategoryForm.name, color: editCategoryForm.color });
    setEditingCategoryId(null);
  };

  const handleStartEditSubcategory = (subcategory: { id: string; name: string }) => {
    setEditingSubcategoryId(subcategory.id);
    setEditSubcategoryName(subcategory.name);
  };

  const handleSaveEditSubcategory = (subcategoryId: string) => {
    updateSubcategory(subcategoryId, editSubcategoryName);
    setEditingSubcategoryId(null);
  };

  const handleAddSubcategory = (categoryId: string) => {
    const name = subcategoryForms[categoryId];
    if (!name) return;
    addSubcategory(categoryId, name);
    setSubcategoryForms(prev => ({ ...prev, [categoryId]: '' }));
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const sortedPeriods = [...data.billingPeriods].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie períodos de fatura, receitas e categorias</p>
      </div>

      <Tabs value={currentTab} onValueChange={onTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="periods">Períodos</TabsTrigger>
          <TabsTrigger value="income">Receitas</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
        </TabsList>

        {/* Períodos de Fatura */}
        <TabsContent value="periods" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Novo Período de Fatura</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPeriod} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Mês de Referência</Label>
                    <Select
                      value={periodForm.month}
                      onValueChange={(value) => setPeriodForm({ ...periodForm, month: value, startMonth: value, endMonth: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent position="popper" side="bottom" className="max-h-[200px] overflow-y-auto">
                        {MONTHS.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ano</Label>
                    <Select
                      value={periodForm.year}
                      onValueChange={(value) => setPeriodForm({ ...periodForm, year: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent position="popper" side="bottom">
                        {YEARS.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Data Início (Dia/Mês)</Label>
                    <div className="flex gap-2">
                      <Select
                        value={periodForm.startDay}
                        onValueChange={(value) => setPeriodForm({ ...periodForm, startDay: value })}
                      >
                        <SelectTrigger className="w-[80px]">
                          <SelectValue placeholder="Dia" />
                        </SelectTrigger>
                        <SelectContent position="popper" side="bottom" className="max-h-[200px] overflow-y-auto">
                          {DAYS.map((day) => (
                            <SelectItem key={day} value={day}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={periodForm.startMonth}
                        onValueChange={(value) => setPeriodForm({ ...periodForm, startMonth: value })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Mês" />
                        </SelectTrigger>
                        <SelectContent position="popper" side="bottom" className="max-h-[200px] overflow-y-auto">
                          {MONTHS.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim (Dia/Mês)</Label>
                    <div className="flex gap-2">
                      <Select
                        value={periodForm.endDay}
                        onValueChange={(value) => setPeriodForm({ ...periodForm, endDay: value })}
                      >
                        <SelectTrigger className="w-[80px]">
                          <SelectValue placeholder="Dia" />
                        </SelectTrigger>
                        <SelectContent position="popper" side="bottom" className="max-h-[200px] overflow-y-auto">
                          {DAYS.map((day) => (
                            <SelectItem key={day} value={day}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={periodForm.endMonth}
                        onValueChange={(value) => setPeriodForm({ ...periodForm, endMonth: value })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Mês" />
                        </SelectTrigger>
                        <SelectContent position="popper" side="bottom" className="max-h-[200px] overflow-y-auto">
                          {MONTHS.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Período
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Períodos Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedPeriods.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum período cadastrado
                </p>
              ) : (
                <div className="space-y-3">
                  {sortedPeriods.map(period => (
                    <div
                      key={period.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      {editingPeriodId === period.id ? (
                        <div className="flex-1 space-y-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Select
                              value={editPeriodForm.month}
                              onValueChange={(value) => setEditPeriodForm({ ...editPeriodForm, month: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Mês Ref." />
                              </SelectTrigger>
                              <SelectContent position="popper" side="bottom" className="max-h-[200px] overflow-y-auto">
                                {MONTHS.map((month) => (
                                  <SelectItem key={month.value} value={month.value}>
                                    {month.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={editPeriodForm.year}
                              onValueChange={(value) => setEditPeriodForm({ ...editPeriodForm, year: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Ano" />
                              </SelectTrigger>
                              <SelectContent position="popper" side="bottom">
                                {YEARS.map((year) => (
                                  <SelectItem key={year} value={year}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="flex gap-1">
                              <Select
                                value={editPeriodForm.startDay}
                                onValueChange={(value) => setEditPeriodForm({ ...editPeriodForm, startDay: value })}
                              >
                                <SelectTrigger className="w-[70px]">
                                  <SelectValue placeholder="Dia" />
                                </SelectTrigger>
                                <SelectContent position="popper" side="bottom" className="max-h-[200px] overflow-y-auto">
                                  {DAYS.map((day) => (
                                    <SelectItem key={day} value={day}>
                                      {day}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={editPeriodForm.startMonth}
                                onValueChange={(value) => setEditPeriodForm({ ...editPeriodForm, startMonth: value })}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Mês Início" />
                                </SelectTrigger>
                                <SelectContent position="popper" side="bottom" className="max-h-[200px] overflow-y-auto">
                                  {MONTHS.map((month) => (
                                    <SelectItem key={month.value} value={month.value}>
                                      {month.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-1">
                              <Select
                                value={editPeriodForm.endDay}
                                onValueChange={(value) => setEditPeriodForm({ ...editPeriodForm, endDay: value })}
                              >
                                <SelectTrigger className="w-[70px]">
                                  <SelectValue placeholder="Dia" />
                                </SelectTrigger>
                                <SelectContent position="popper" side="bottom" className="max-h-[200px] overflow-y-auto">
                                  {DAYS.map((day) => (
                                    <SelectItem key={day} value={day}>
                                      {day}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={editPeriodForm.endMonth}
                                onValueChange={(value) => setEditPeriodForm({ ...editPeriodForm, endMonth: value })}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Mês Fim" />
                                </SelectTrigger>
                                <SelectContent position="popper" side="bottom" className="max-h-[200px] overflow-y-auto">
                                  {MONTHS.map((month) => (
                                    <SelectItem key={month.value} value={month.value}>
                                      {month.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" onClick={() => handleSaveEditPeriod(period.id)}>
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditingPeriodId(null)}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="font-medium">{period.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(period.startDate), 'dd/MM/yyyy')} - {format(parseISO(period.endDate), 'dd/MM/yyyy')}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleStartEditPeriod(period)}>
                              <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir período?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Isso também removerá a receita associada. As despesas serão mantidas.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteBillingPeriod(period.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receitas Mensais */}
        <TabsContent value="income" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Receitas por Período</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedPeriods.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Cadastre um período de fatura primeiro
                </p>
              ) : (
                <div className="space-y-4">
                  {sortedPeriods.map(period => {
                    const formValues = getIncomeFormValues(period.id);
                    const savedIncome = getIncomeForPeriod(period.id);

                    return (
                      <div key={period.id} className="rounded-lg border p-4">
                        <div className="mb-4">
                          <p className="font-medium">{period.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(period.startDate), 'dd/MM/yyyy')} - {format(parseISO(period.endDate), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Salário</Label>
                            <CurrencyInput
                              value={formValues.salary}
                              onChange={(value) =>
                                setIncomeForm(prev => ({
                                  ...prev,
                                  [period.id]: { ...formValues, salary: value },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Extra</Label>
                            <CurrencyInput
                              value={formValues.extra}
                              onChange={(value) =>
                                setIncomeForm(prev => ({
                                  ...prev,
                                  [period.id]: { ...formValues, extra: value },
                                }))
                              }
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              onClick={() => handleSaveIncome(period.id)}
                              className="w-full"
                              variant="secondary"
                            >
                              Salvar
                            </Button>
                          </div>
                        </div>
                        {savedIncome && (
                          <p className="mt-3 text-sm text-muted-foreground">
                            Total cadastrado: {formatCurrency(savedIncome.salary + savedIncome.extra)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categorias */}
        <TabsContent value="categories" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Nova Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCategory} className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="categoryName">Nome</Label>
                  <Input
                    id="categoryName"
                    placeholder="Ex: Educação"
                    value={categoryForm.name}
                    onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <ColorPicker
                    value={categoryForm.color}
                    onChange={(color) => setCategoryForm({ ...categoryForm, color })}
                  />
                </div>
                <Button type="submit">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Categorias e Subcategorias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.categories.map(category => (
                  <Collapsible
                    key={category.id}
                    open={openCategories.includes(category.id)}
                    onOpenChange={() => toggleCategory(category.id)}
                  >
                    <div className="rounded-lg border">
                      <CollapsibleTrigger asChild>
                        <div className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            {openCategories.includes(category.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            {editingCategoryId === category.id ? (
                              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                <ColorPicker
                                  value={editCategoryForm.color}
                                  onChange={(color) => setEditCategoryForm({ ...editCategoryForm, color })}
                                />
                                <Input
                                  value={editCategoryForm.name}
                                  onChange={e => setEditCategoryForm({ ...editCategoryForm, name: e.target.value })}
                                  className="h-8 w-40"
                                  onClick={e => e.stopPropagation()}
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleSaveEditCategory(category.id); }}>
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingCategoryId(null); }}>
                                  <X className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div
                                  className="h-4 w-4 rounded-full"
                                  style={{ backgroundColor: category.color }}
                                />
                                <span className="font-medium">{category.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  ({category.subcategories.length} subcategorias)
                                </span>
                              </>
                            )}
                          </div>
                          {editingCategoryId !== category.id && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={e => { e.stopPropagation(); handleStartEditCategory(category); }}
                              >
                                <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Isso excluirá todas as subcategorias e despesas relacionadas.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteCategory(category.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t p-4 space-y-3">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Nova subcategoria..."
                              value={subcategoryForms[category.id] || ''}
                              onChange={e =>
                                setSubcategoryForms(prev => ({
                                  ...prev,
                                  [category.id]: e.target.value,
                                }))
                              }
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddSubcategory(category.id);
                                }
                              }}
                            />
                            <Button
                              size="icon"
                              onClick={() => handleAddSubcategory(category.id)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {category.subcategories.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Nenhuma subcategoria
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {category.subcategories.map(sub => (
                                <div
                                  key={sub.id}
                                  className="flex items-center justify-between rounded bg-muted/50 px-3 py-2"
                                >
                                  {editingSubcategoryId === sub.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <Input
                                        value={editSubcategoryName}
                                        onChange={e => setEditSubcategoryName(e.target.value)}
                                        className="h-7 text-sm"
                                      />
                                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveEditSubcategory(sub.id)}>
                                        <Check className="h-3 w-3 text-green-600" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingSubcategoryId(null)}>
                                        <X className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-sm">{sub.name}</span>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => handleStartEditSubcategory(sub)}
                                        >
                                          <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Excluir subcategoria?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                As despesas desta subcategoria também serão excluídas.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => deleteSubcategory(category.id, sub.id)}
                                              >
                                                Excluir
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metas */}
        <TabsContent value="goals" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Metas por Categoria</CardTitle>
              <p className="text-sm text-muted-foreground">
                Defina o valor máximo que deseja gastar mensalmente por categoria.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.categories.map(category => (
                  <div key={category.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: category.color }} />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="w-40">
                        <CurrencyInput
                          value={goalForms[category.id]}
                          onChange={(val) => setGoalForms(prev => ({ ...prev, [category.id]: val }))}
                          placeholder="0,00"
                        />
                      </div>
                      <Button size="sm" onClick={() => handleSaveGoal(category.id)}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    </div>
                  </div>
                ))}
                {data.categories.length === 0 && (
                  <p className="text-center text-muted-foreground">Nenhuma categoria cadastrada</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
