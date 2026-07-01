import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Category, Expense } from '@/types/finance';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const [hoveredItem, setHoveredItem] = useState<any | null>(null);

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
        id: exp.id, // Add unique ID
        name: exp.description,
        value: exp.amount,
        date: exp.purchaseDate,
        color: `hsl(${(index * 30) + 200}, 70%, 50%)`,
        percentage: (exp.amount / (categoryTotals.find(c => c.id === selectedCategory.id)?.subcategories?.find(s => s.id === selectedSubcategory.id)?.value || 1)) * 100,
      }))
    : [];

  // Determine current chart data based on hierarchy level
  const chartData = useMemo(() => {
    return selectedSubcategory
      ? subcategoryExpensesData
      : selectedCategory
        ? selectedCategory.subcategories?.map((sub, index) => ({
          id: sub.id, // Ensure ID is passed
          name: sub.name,
          value: sub.value,
          color: `hsl(${(index * 45) + 120}, 70%, 50%)`,
          percentage: sub.percentage,
        })) || []
        : categoryTotals;
  }, [selectedCategory, selectedSubcategory, categoryTotals, subcategoryExpensesData]);

  const activeIndex = hoveredItem ? chartData.findIndex(item => item.id === hoveredItem.id) : -1;

  // Animation Lock Logic
  const [isAnimating, setIsAnimating] = useState(false);

  // Helper to trigger animation lock
  const triggerAnimationLock = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1500);
  };

  const handlePieClick = (data: any) => {
    if (selectedSubcategory) {
      return;
    }

    if (selectedCategory) {
      // Currently displaying Subcategories, click drills down to Expenses
      const subcategory = selectedCategory.subcategories?.find(s => s.name === data.name);
      if (subcategory) {
        triggerAnimationLock(); // Lock BEFORE state update
        setSelectedSubcategory({ id: subcategory.id, name: subcategory.name });
      }
    } else {
      // Currently displaying Categories, click drills down to Subcategories
      const category = categoryTotals.find(c => c.name === data.name);
      if (category && category.subcategories && category.subcategories.length > 0) {
        triggerAnimationLock(); // Lock BEFORE state update
        setSelectedCategory(category);
      }
    }
    setHoveredItem(null); // Reset hover on click to avoid stuck state
  };

  const handleBack = () => {
    triggerAnimationLock(); // Lock BEFORE state update
    if (selectedSubcategory) {
      setSelectedSubcategory(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    }
    setHoveredItem(null);
  };

  // Trigger animation on mount/initial load
  useEffect(() => {
    triggerAnimationLock();
  }, []);

  // Center Info Logic
  const chartTotal = chartData.reduce((acc: number, item: any) => acc + item.value, 0);
  const centerLabel = hoveredItem ? hoveredItem.name : 'Total';
  const centerValue = hoveredItem ? hoveredItem.value : chartTotal;

  // Render Active Shape (Hover Effect)
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;

    // Use the component Source-of-Truth for color if possible, or fallback to fill
    const color = payload.color || fill;

    return (
      <g style={{ outline: 'none' }}>
        <path d={props.d} fill={color} style={{ outline: 'none' }} /> {/* Render standard sector first to be safe */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius} // Keep inner radius same
          outerRadius={outerRadius + 10} // Expand outer radius by 10px
          startAngle={startAngle}
          endAngle={endAngle}
          fill={color}
          className="transition-all duration-300 ease-out focus:outline-none"
          style={{ filter: 'brightness(1.1)', outline: 'none' }} // Add brightness boost and remove outline
        />
      </g>
    );
  };

  // Custom Label Render
  const renderCustomLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, value, index, name, color, percentage } = props;

    // Only show label for > 4% to avoid clutter
    if (percentage < 4) return null;

    const RADIAN = Math.PI / 180;
    // Calculate positions - Use the standard outerRadius for label positioning logic
    // even if the shape is expanded, to keep labels stable.
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const sin = Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-midAngle * RADIAN);

    // Start of line (on the donut)
    const sx = cx + (outerRadius) * cos;
    const sy = cy + (outerRadius) * sin;

    // Elbow of line
    const mx = cx + (outerRadius + 15) * cos;
    const my = cy + (outerRadius + 15) * sin;

    // End of line
    const ex = mx + (cos >= 0 ? 1 : -1) * 15;
    const ey = my;

    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={color} fill="none" opacity={0.6} />
        <circle cx={ex} cy={ey} r={2} fill={color} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} dy={4} textAnchor={textAnchor} fill={color} fontSize={12} fontWeight="600">
          {`${name}`}
        </text>
        {/* Optional: Show % in label too, or just keep it clean with name */}
        <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} dy={16} textAnchor={textAnchor} fill="#999" fontSize={10}>
          {`${percentage.toFixed(0)}%`}
        </text>
      </g>
    );
  };

  return (
    <Card className="liquid-glass liquid-glass-bevel border-0 shadow-sm rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100">
          {(selectedCategory || selectedSubcategory) ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-8 w-8 p-0 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                {selectedSubcategory ? (
                  <>
                    <span className="text-slate-400 hidden sm:inline">{selectedCategory?.name}</span>
                    <span className="text-slate-400 hidden sm:inline"> {'>'} </span>
                    <span className="text-slate-800 dark:text-slate-100">{selectedSubcategory.name}</span>
                  </>
                ) : (
                  <span className="text-slate-800 dark:text-slate-100">{selectedCategory?.name}</span>
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
          {/* Global style override for chart focus outlines */}
          <style>{`
            .recharts-sector:focus,
            .recharts-layer:focus,
            .recharts-pie-sector:focus,
            path:focus {
              outline: none !important;
            }
          `}</style>

          <div className="h-[260px] w-full relative">
            {/* Center Info Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center flex flex-col items-center">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider font-manrope max-w-[110px] truncate">{centerLabel}</p>
                <p className="text-lg lg:text-xl font-extrabold font-manrope bg-gradient-to-r from-slate-950 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mt-0.5">{formatCurrency(centerValue)}</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={2.5}
                  dataKey="value"
                  onClick={handlePieClick}
                  onMouseEnter={(_, index) => !isAnimating && setHoveredItem(chartData[index])}
                  onMouseLeave={() => setHoveredItem(null)}
                  label={renderCustomLabel}
                  labelLine={false}
                  animationBegin={0}
                  animationDuration={1000}
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  style={{ cursor: selectedSubcategory ? 'default' : 'pointer', outline: 'none' }}
                  isAnimationActive={true}
                  tabIndex={-1}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      strokeWidth={0}
                      stroke="#fff"
                      style={{ outline: 'none' }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
            {chartData.map((item: any, index) => (
              <div
                key={`${item.name}-${index}`}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 border border-transparent",
                  !selectedSubcategory && "hover:bg-slate-100/50 dark:hover:bg-slate-900/40 hover:border-slate-200/30 dark:hover:border-white/5 cursor-pointer",
                  hoveredItem === item && "bg-slate-100/70 dark:bg-slate-900/60 border-slate-200/50 dark:border-white/10 shadow-sm"
                )}
                onClick={() => !isAnimating && !selectedSubcategory && handlePieClick(item)}
                onMouseEnter={() => !isAnimating && setHoveredItem(item)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{ pointerEvents: isAnimating ? 'none' : 'auto' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-1 break-all" title={item.name}>
                      {item.name}
                    </span>
                    {item.date && (
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">
                        {formatDate(item.date)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right whitespace-nowrap ml-2 shrink-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{formatCurrency(item.value)}</p>
                  <p className="text-[10px] text-slate-400 font-mono font-medium">
                    {item.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
            {chartData.length === 0 && (
              <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-8 font-medium">
                Nenhuma despesa registrada
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
