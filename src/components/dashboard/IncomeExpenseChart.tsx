import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ComposedChart, 
  Area, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { BillingPeriod, Expense } from '@/types/finance';

interface MonthlyChartData {
  name: string;
  receita: number;
  despesas: number;
}

interface IncomeExpenseChartProps {
  monthlyData: MonthlyChartData[];
  periodExpenses: Expense[];
  selectedPeriod?: BillingPeriod;
}

export function IncomeExpenseChart({ 
  monthlyData, 
  periodExpenses, 
  selectedPeriod 
}: IncomeExpenseChartProps) {
  const [viewMode, setViewMode] = useState<'monthly' | 'daily'>('monthly');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
    }).format(value);
  };

  // Geração dos dados diários do período selecionado
  const dailyData = useMemo(() => {
    if (!selectedPeriod || periodExpenses.length === 0) return [];

    try {
      const start = parseISO(selectedPeriod.startDate);
      const end = parseISO(selectedPeriod.endDate);
      
      // Obter todos os dias no intervalo do período
      const days = eachDayOfInterval({ start, end });

      let cumulativeSum = 0;

      return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        
        // Filtrar e somar as despesas daquele dia
        const dayExpenses = periodExpenses.filter(e => e.purchaseDate === dayStr);
        const dayTotal = dayExpenses.reduce((acc, exp) => acc + exp.amount, 0);
        cumulativeSum += dayTotal;

        return {
          name: format(day, 'dd/MM'),
          'Gasto no Dia': dayTotal,
          'Acumulado': cumulativeSum,
        };
      });
    } catch (error) {
      console.error("Erro ao calcular dados diários:", error);
      return [];
    }
  }, [selectedPeriod, periodExpenses]);

  return (
    <Card className="liquid-glass liquid-glass-bevel border-0 shadow-sm rounded-2xl">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <CardTitle className="text-base font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100">
            {viewMode === 'monthly' ? 'Fluxo de Caixa Mensal' : `Despesas Diárias (${selectedPeriod?.name || 'Fatura'})`}
          </CardTitle>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            {viewMode === 'monthly' ? 'Comparativo de receitas e despesas nos últimos 6 meses' : 'Visão detalhada do ritmo de gastos no período selecionado'}
          </p>
        </div>

        {/* Seletor de Visão em Vidro Líquido com Indicador Deslizante */}
        <div className="relative flex bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-xl w-fit self-start sm:self-center border border-white/10 overflow-hidden">
          {/* Indicador de Fundo Deslizante (Vidro Líquido / Glassmorphism Esmeralda) */}
          <div 
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-brand-500/15 dark:bg-brand-500/20 backdrop-blur-sm border border-brand-500/35 dark:border-brand-500/30 transition-transform duration-300 shadow-[0_2px_10px_-3px_rgba(16,185,129,0.2)] ${
              viewMode === 'monthly' ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)'
            }}
          />

          <button
            onClick={() => setViewMode('monthly')}
            className={`relative z-10 w-20 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
              viewMode === 'monthly'
                ? 'text-brand-700 dark:text-brand-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setViewMode('daily')}
            disabled={!selectedPeriod || periodExpenses.length === 0}
            className={`relative z-10 w-20 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
              !selectedPeriod || periodExpenses.length === 0 ? 'opacity-40 cursor-not-allowed' : ''
            } ${
              viewMode === 'daily'
                ? 'text-brand-700 dark:text-brand-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Diário
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-6">
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <ComposedChart 
              data={viewMode === 'monthly' ? monthlyData : dailyData} 
              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200/50 dark:stroke-slate-800/40" />
              
              <XAxis 
                dataKey="name" 
                className="text-[10px] font-medium font-mono"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                className="text-[10px] font-medium font-mono"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '11px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                  fontFamily: 'Inter, sans-serif'
                }}
                labelStyle={{ fontWeight: 'bold', color: '#10b981', marginBottom: '4px' }}
              />
              
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontFamily: 'Manrope, sans-serif',
                  opacity: 0.8
                }}
              />

              {viewMode === 'monthly' ? (
                <>
                  <Area 
                    type="monotone" 
                    dataKey="receita" 
                    stroke="#10b981" 
                    strokeWidth={2.5}
                    fill="url(#colorReceita)"
                    name="Receita"
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="despesas" 
                    stroke="#f43f5e" 
                    strokeWidth={2.5}
                    fill="url(#colorDespesas)"
                    name="Despesas"
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#f43f5e' }}
                  />
                </>
              ) : (
                <>
                  <Bar 
                    dataKey="Gasto no Dia" 
                    fill="#f43f5e" 
                    opacity={0.35} 
                    radius={[3, 3, 0, 0]} 
                    barSize={10}
                    name="Gasto no Dia"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Acumulado" 
                    stroke="#3b82f6" 
                    strokeWidth={2.5}
                    fill="url(#colorAcumulado)"
                    name="Gasto Acumulado"
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
