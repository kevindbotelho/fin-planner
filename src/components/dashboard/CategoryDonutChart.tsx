import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Category, Expense } from '@/types/finance';
import { format } from 'date-fns';

interface CategoryDonutChartProps {
  expenses: Expense[];
  categories: Category[];
}

interface CategoryTotal {
  id: string;
  name: string;
  value: number;
  color: string;
  percentage: number;
  subcategories?: { id: string; name: string; value: number; percentage: number }[];
}

export function CategoryDonutChart({ expenses, categories }: CategoryDonutChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryTotal | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<{ id: string; name: string } | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

  const categoryTotals: CategoryTotal[] = categories
    .map(category => {
      const categoryExpenses = expenses.filter(e => e.categoryId === category.id);
      const total = categoryExpenses.reduce((acc, exp) => acc + exp.amount, 0);

      const subcategoryTotals = category.subcategories.map(sub => {
        const subExpenses = categoryExpenses.filter(e => e.subcategoryId === sub.id);
        const subTotal = subExpenses.reduce((acc, exp) => acc + exp.amount, 0);
        return {
          id: sub.id,
          name: sub.name,
          value: subTotal,
          percentage: total > 0 ? (subTotal / total) * 100 : 0,
        };
      }).filter(s => s.value > 0);

      return {
        id: category.id,
        name: category.name,
        value: total,
        color: category.color,
        percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
        subcategories: subcategoryTotals,
      };
    })
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value);

  // Calculate Subcategory Expenses (Level 3)
  const subcategoryExpensesData = selectedCategory && selectedSubcategory
    ? expenses
      .filter(e => e.categoryId === selectedCategory.id && e.subcategoryId === selectedSubcategory.id)
      .sort((a, b) => {
        // Sort by Date Descending (Newest first)
        const dateComparison = new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
        if (dateComparison !== 0) return dateComparison;
        return 0;
      })
      .map((exp, index) => ({
        name: exp.description,
        value: exp.amount,
        date: exp.purchaseDate, // Add date field
        color: `hsl(${(index * 30) + 200}, 70%, 50%)`,
        percentage: (exp.amount / (categoryTotals.find(c => c.id === selectedCategory.id)?.subcategories?.find(s => s.id === selectedSubcategory.id)?.value || 1)) * 100,
      }))
    : [];

  // Determine current chart data based on hierarchy level
  const chartData = selectedSubcategory
    ? subcategoryExpensesData
    : selectedCategory
      ? selectedCategory.subcategories?.map((sub, index) => ({
        name: sub.name,
        value: sub.value,
        color: `hsl(${(index * 45) + 120}, 70%, 50%)`,
        percentage: sub.percentage,
      })) || []
      : categoryTotals;

  const handlePieClick = (data: any) => {
    if (selectedSubcategory) {
      return;
    }

    if (selectedCategory) {
      // Currently displaying Subcategories, click drills down to Expenses
      const subcategory = selectedCategory.subcategories?.find(s => s.name === data.name);
      if (subcategory) {
        setSelectedSubcategory({ id: subcategory.id, name: subcategory.name });
      }
    } else {
      // Currently displaying Categories, click drills down to Subcategories
      const category = categoryTotals.find(c => c.name === data.name);
      if (category && category.subcategories && category.subcategories.length > 0) {
        setSelectedCategory(category);
      }
    }
  };

  const handleBack = () => {
    if (selectedSubcategory) {
      setSelectedSubcategory(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">
          {(selectedCategory || selectedSubcategory) ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 text-sm sm:text-lg">
                {selectedSubcategory ? (
                  <>
                    <span className="text-muted-foreground hidden sm:inline">{selectedCategory?.name}</span>
                    <span className="text-muted-foreground hidden sm:inline"> {'>'} </span>
                    <span>{selectedSubcategory.name}</span>
                  </>
                ) : (
                  <span>{selectedCategory?.name}</span>
                )}
              </div>
            </div>
          ) : (
            'Despesas por Categoria'
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={130}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={handlePieClick}
                  style={{ cursor: selectedSubcategory ? 'default' : 'pointer' }}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {chartData.map((item: any, index) => (
              <div
                key={`${item.name}-${index}`}
                className={`flex items-center justify-between p-2 rounded-lg transition-colors ${!selectedSubcategory ? 'hover:bg-muted/50 cursor-pointer' : ''}`}
                onClick={() => !selectedSubcategory && handlePieClick(item)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-medium line-clamp-1 break-all" title={item.name}>{item.name}</span>
                    {item.date && (
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(item.date)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right whitespace-nowrap ml-2 shrink-0">
                  <p className="text-sm font-semibold">{formatCurrency(item.value)}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
            {chartData.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma despesa registrada
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
