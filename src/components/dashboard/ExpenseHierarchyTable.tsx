import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
    }[];
  }[];
}

export function ExpenseHierarchyTable({ expenses, categories, totalIncome }: ExpenseHierarchyTableProps) {
  const [expandedTypes, setExpandedTypes] = useState<string[]>(['fixed', 'variable']);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const hierarchyData = useMemo(() => {
    const result: HierarchyData[] = [
      { type: 'fixed', label: 'Despesas Fixas', total: 0, categories: [] },
      { type: 'variable', label: 'Despesas Variáveis', total: 0, categories: [] },
    ];

    expenses.forEach(expense => {
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
        };
        categoryData.subcategories.push(subcategoryData);
      }
      subcategoryData.total += expense.amount;
    });

    // Sort by total descending
    result.forEach(type => {
      type.categories.sort((a, b) => b.total - a.total);
      type.categories.forEach(cat => {
        cat.subcategories.sort((a, b) => b.total - a.total);
      });
    });

    return result;
  }, [expenses, categories]);

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

  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

  if (expenses.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Despesas por Tipo</CardTitle>
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
                          categoryData.subcategories.map(subcategoryData => (
                            <TableRow
                              key={`${categoryKey}-${subcategoryData.subcategoryId}`}
                              className="bg-muted/20"
                            >
                              <TableCell>
                                <div className="pl-14 text-sm text-muted-foreground">
                                  {subcategoryData.subcategoryName}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm text-expense">
                                {formatCurrency(subcategoryData.total)}
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {totalExpenses > 0 ? ((subcategoryData.total / totalExpenses) * 100).toFixed(1) : 0}%
                              </TableCell>
                            </TableRow>
                          ))}
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
