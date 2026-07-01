import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Landmark, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ReservesWidget() {
    const {
        data,
        selectedPeriodId,
        getExpensesForPeriod,
        toggleExpenseFulfilled,
    } = useFinance();

    if (!selectedPeriodId) return null;

    const periodExpenses = getExpensesForPeriod(selectedPeriodId);
    const reserves = periodExpenses.filter(e => e.isReserve);

    if (reserves.length === 0) return null;

    const fulfilledCount = reserves.filter(r => r.isFulfilled).length;
    const pendingCount = reserves.length - fulfilledCount;
    const totalAmount = reserves.reduce((acc, r) => acc + r.amount, 0);
    const fulfilledAmount = reserves.filter(r => r.isFulfilled).reduce((acc, r) => acc + r.amount, 0);
    const pendingAmount = totalAmount - fulfilledAmount;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const getCategoryById = (id: string) => data.categories.find(c => c.id === id);

    return (
        <Card className="liquid-glass liquid-glass-bevel border-0 shadow-sm flex flex-col h-full rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Landmark className="h-4.5 w-4.5 text-brand-500" />
                    Reservas do Período
                </CardTitle>
                <Badge 
                    className={cn(
                        "h-5 px-2 text-[9px] font-bold tracking-wider uppercase border-0 pointer-events-none flex items-center gap-1",
                        pendingCount === 0 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    )}
                >
                    {pendingCount === 0 ? (
                        <><Check className="h-3 w-3" /> Concluído</>
                    ) : (
                        <><Clock className="h-3 w-3" /> {pendingCount} pendente{pendingCount > 1 ? 's' : ''}</>
                    )}
                </Badge>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-2.5">
                    {reserves.map(reserve => {
                        const category = getCategoryById(reserve.categoryId);

                        return (
                            <div
                                key={reserve.id}
                                onClick={() => toggleExpenseFulfilled(reserve.id, !reserve.isFulfilled)}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer",
                                    reserve.isFulfilled 
                                        ? "bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-500/10 dark:border-emerald-500/10 hover:bg-emerald-500/10" 
                                        : "bg-slate-100/30 dark:bg-slate-900/30 border-transparent hover:bg-slate-100/50 dark:hover:bg-slate-900/50 hover:border-slate-200/30 dark:hover:border-white/5"
                                )}
                            >
                                <Checkbox
                                    checked={reserve.isFulfilled}
                                    onCheckedChange={() => {}}
                                    className={cn(
                                        "h-5 w-5 pointer-events-none rounded-md border-slate-300 dark:border-slate-800",
                                        reserve.isFulfilled && "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                    )}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        {category && (
                                            <div
                                                className="h-2 w-2 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: category.color }}
                                            />
                                        )}
                                        <span className={cn(
                                            "text-xs font-semibold truncate",
                                            reserve.isFulfilled ? "line-through text-slate-400 dark:text-slate-600" : "text-slate-700 dark:text-slate-200"
                                        )}>
                                            {reserve.description}
                                        </span>
                                    </div>
                                    {category && (
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 block">{category.name}</span>
                                    )}
                                </div>
                                <span className={cn(
                                    "text-xs font-mono font-bold whitespace-nowrap",
                                    reserve.isFulfilled ? "text-emerald-500/70 dark:text-emerald-400/70" : "text-slate-800 dark:text-slate-100"
                                )}>
                                    {formatCurrency(reserve.amount)}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Summary footer */}
                <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/50 mt-4 flex justify-between text-[11px] font-medium text-slate-500">
                    <div>
                        <span>Separado: </span>
                        <span className="font-bold text-emerald-500">{formatCurrency(fulfilledAmount)}</span>
                    </div>
                    <div>
                        <span>Pendente: </span>
                        <span className={cn(
                            "font-bold",
                            pendingAmount > 0 ? "text-amber-500" : "text-emerald-500"
                        )}>
                            {formatCurrency(pendingAmount)}
                        </span>
                    </div>
                    <div>
                        <span>Total: </span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-100 font-manrope">{formatCurrency(totalAmount)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
