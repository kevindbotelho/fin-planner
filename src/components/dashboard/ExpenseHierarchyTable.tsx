import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { Expense, Category, ExpenseType } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { format } from 'date-fns';

interface ExpenseHierarchyTableProps {
  expenses: Expense[];
  categories: Category[];
  totalIncome: number;
}

interface HierarchyData {
  type: 'fixed' | 'variable';
  label: string;
  total: number;
  categories: {
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    total: number;
    subcategories: {
      subcategoryId: string;
      subcategoryName: string;
      total: number;
      expenses: Expense[];
    }[];
  }[];
}

export function ExpenseHierarchyTable({ expenses, categories, totalIncome }: ExpenseHierarchyTableProps) {
  const [expandedTypes, setExpandedTypes] = useState<string[]>(['fixed', 'variable']);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedSubcategories, setExpandedSubcategories] = useState<string[]>([]);

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterType, setFilterType] = useState<ExpenseType | 'all'>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [filterSubcategoryId, setFilterSubcategoryId] = useState<string>('all');

  const hasActiveFilters = filterDate || filterType !== 'all' || filterCategoryId !== 'all' || filterSubcategoryId !== 'all';

  const clearFilters = () => {
    setFilterDate('');
    setFilterType('all');
    setFilterCategoryId('all');
    setFilterSubcategoryId('all');
  };

  // Reset subcategory filter when category changes
  const handleCategoryFilterChange = (value: string) => {
    setFilterCategoryId(value);
    setFilterSubcategoryId('all');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM');
  };

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      // Date filter
      if (filterDate && expense.purchaseDate !== filterDate) return false;

      // Type filter
      if (filterType !== 'all' && (expense.type || 'variable') !== filterType) return false;

      // Category filter
      if (filterCategoryId !== 'all' && expense.categoryId !== filterCategoryId) return false;

      // Subcategory filter
      if (filterSubcategoryId !== 'all' && expense.subcategoryId !== filterSubcategoryId) return false;

      return true;
    });
  }, [expenses, filterDate, filterType, filterCategoryId, filterSubcategoryId]);

  // Computed available subcategories for the filter
  const availableSubcategories = useMemo(() => {
    if (filterCategoryId === 'all') return [];

    const category = categories.find(c => c.id === filterCategoryId);
    if (!category) return [];

    // Get IDs of subcategories that are actually used in the current list
    const usedSubcategoryIds = new Set(
      expenses
        .filter(e => e.categoryId === filterCategoryId && e.subcategoryId)
        .map(e => e.subcategoryId)
    );

    return category.subcategories.filter(sub => usedSubcategoryIds.has(sub.id));
  }, [expenses, filterCategoryId, categories]);

  const hierarchyData = useMemo(() => {
    const result: HierarchyData[] = [
      { type: 'fixed', label: 'Despesas Fixas', total: 0, categories: [] },
      { type: 'variable', label: 'Despesas Variáveis', total: 0, categories: [] },
    ];

    filteredExpenses.forEach(expense => {
      const expenseType = expense.type || 'variable';
      const typeData = result.find(t => t.type === expenseType)!;
      typeData.total += expense.amount;

      let categoryData = typeData.categories.find(c => c.categoryId === expense.categoryId);
      if (!categoryData) {
        const category = categories.find(c => c.id === expense.categoryId);
        categoryData = {
          categoryId: expense.categoryId,
          categoryName: category?.name || 'Sem categoria',
          categoryColor: category?.color || '#888888',
          total: 0,
          subcategories: [],
        };
        typeData.categories.push(categoryData);
      }
      categoryData.total += expense.amount;

      let subcategoryData = categoryData.subcategories.find(s => s.subcategoryId === expense.subcategoryId);
      if (!subcategoryData) {
        const category = categories.find(c => c.id === expense.categoryId);
        const subcategory = category?.subcategories.find(s => s.id === expense.subcategoryId);
        subcategoryData = {
          subcategoryId: expense.subcategoryId,
          subcategoryName: subcategory?.name || 'Sem subcategoria',
          total: 0,
          expenses: [],
        };
        categoryData.subcategories.push(subcategoryData);
      }
      subcategoryData.total += expense.amount;
      subcategoryData.expenses.push(expense);
    });

    // Sort by total descending
    result.forEach(type => {
      type.categories.sort((a, b) => b.total - a.total);
      type.categories.forEach(cat => {
        cat.subcategories.sort((a, b) => b.total - a.total);
        // Sort expenses by date descending
        cat.subcategories.forEach(sub => {
          sub.expenses.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
        });
      });
    });

    // Filter out types based on the selected filter
    if (filterType !== 'all') {
      return result.filter(t => t.type === filterType);
    }

    return result;
  }, [filteredExpenses, categories, filterType]);

  const toggleType = (type: string) => {
    setExpandedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryKey) ? prev.filter(c => c !== categoryKey) : [...prev, categoryKey]
    );
  };

  const toggleSubcategory = (subcategoryKey: string) => {
    setExpandedSubcategories(prev =>
      prev.includes(subcategoryKey) ? prev.filter(s => s !== subcategoryKey) : [...prev, subcategoryKey]
    );
  };

  const totalExpenses = filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0);

  if (expenses.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Despesas por Tipo</CardTitle>
          <div className="text-right">
            {hasActiveFilters && (
              <span className="text-xs text-muted-foreground mr-2">Filtrado</span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 p-4 bg-muted/30 rounded-lg border border-border/50 mt-4">
          <div className="space-y-1">
            <Label htmlFor="hierarchy-filter-date" className="text-xs">Data</Label>
            <Input
              id="hierarchy-filter-date"
              type="date"
              className="h-8 text-sm"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="hierarchy-filter-type" className="text-xs">Tipo</Label>
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
            <Label htmlFor="hierarchy-filter-category" className="text-xs">Categoria</Label>
            <Select
              value={filterCategoryId}
              onValueChange={handleCategoryFilterChange}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map(category => (
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
            <Label htmlFor="hierarchy-filter-subcategory" className="text-xs">Subcategoria</Label>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60%]">Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">% do Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hierarchyData.map(typeData => (
              <>
                {/* Type Row (Level 1) */}
                <TableRow
                  key={typeData.type}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleType(typeData.type)}
                >
                  <TableCell className="font-semibold">
                    <div className="flex items-center gap-2">
                      {expandedTypes.includes(typeData.type) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Badge variant={typeData.type === 'fixed' ? 'default' : 'secondary'}>
                        {typeData.label}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-expense">
                    {formatCurrency(typeData.total)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {totalExpenses > 0 ? ((typeData.total / totalExpenses) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>

                {/* Category Rows (Level 2) */}
                {expandedTypes.includes(typeData.type) &&
                  typeData.categories.map(categoryData => {
                    const categoryKey = `${typeData.type}-${categoryData.categoryId}`;
                    return (
                      <>
                        <TableRow
                          key={categoryKey}
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => toggleCategory(categoryKey)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2 pl-6">
                              {expandedCategories.includes(categoryKey) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: categoryData.categoryColor }}
                              />
                              <span className="font-medium">{categoryData.categoryName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium text-expense">
                            {formatCurrency(categoryData.total)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {totalExpenses > 0 ? ((categoryData.total / totalExpenses) * 100).toFixed(1) : 0}%
                          </TableCell>
                        </TableRow>

                        {/* Subcategory Rows (Level 3) */}
                        {expandedCategories.includes(categoryKey) &&
                          categoryData.subcategories.map(subcategoryData => {
                            const subcategoryKey = `${categoryKey}-${subcategoryData.subcategoryId}`;
                            return (
                              <>
                                <TableRow
                                  key={subcategoryKey}
                                  className="cursor-pointer hover:bg-muted/20"
                                  onClick={() => toggleSubcategory(subcategoryKey)}
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-2 pl-14">
                                      {expandedSubcategories.includes(subcategoryKey) ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                      )}
                                      <span className="text-sm text-muted-foreground">
                                        {subcategoryData.subcategoryName}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right text-sm text-expense">
                                    {formatCurrency(subcategoryData.total)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm text-muted-foreground">
                                    {totalExpenses > 0 ? ((subcategoryData.total / totalExpenses) * 100).toFixed(1) : 0}%
                                  </TableCell>
                                </TableRow>

                                {/* Expenses Rows (Level 4) */}
                                {expandedSubcategories.includes(subcategoryKey) &&
                                  subcategoryData.expenses.map(expense => (
                                    <TableRow
                                      key={expense.id}
                                      className="hover:bg-muted/10"
                                    >
                                      <TableCell>
                                        <div className="pl-[4.5rem] flex flex-col">
                                          <span className="text-xs font-medium text-foreground/80">{expense.description}</span>
                                          <span className="text-[10px] text-muted-foreground">{formatDate(expense.purchaseDate)}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right text-xs text-expense">
                                        {formatCurrency(expense.amount)}
                                      </TableCell>
                                      <TableCell className="text-right text-xs text-muted-foreground">
                                        -
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </>
                            );
                          })}
                      </>
                    );
                  })}
              </>
            ))}
            {/* Summary Row - Income */}
            <TableRow className="border-t-2 border-border bg-muted/30">
              <TableCell className="font-semibold text-income">
                Receita Total do Mês
              </TableCell>
              <TableCell className="text-right font-semibold text-income">
                {formatCurrency(totalIncome)}
              </TableCell>
              <TableCell className="text-right font-semibold">
                —
              </TableCell>
            </TableRow>

            {/* Summary Row - Expenses */}
            <TableRow className="bg-muted/30">
              <TableCell className="font-semibold text-expense">
                Total de Despesas
              </TableCell>
              <TableCell className="text-right font-semibold text-expense">
                {formatCurrency(totalExpenses)}
              </TableCell>
              <TableCell className="text-right font-semibold">
                100%
              </TableCell>
            </TableRow>

            {/* Summary Row - Balance */}
            <TableRow className="bg-muted/50">
              <TableCell className="font-bold">
                Saldo Final
              </TableCell>
              <TableCell className={`text-right font-bold ${totalIncome - totalExpenses >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatCurrency(totalIncome - totalExpenses)}
              </TableCell>
              <TableCell className="text-right font-bold">
                —
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
