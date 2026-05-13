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
        <Card className="border-0 shadow-sm flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Landmark className="h-5 w-5" />
                    Reservas do Período
                </CardTitle>
                <Badge 
                    variant={pendingCount === 0 ? 'default' : 'secondary'}
                    className={cn(
                        pendingCount === 0 && 'bg-green-600 hover:bg-green-700'
                    )}
                >
                    {pendingCount === 0 ? (
                        <><Check className="h-3 w-3 mr-1" /> Tudo separado</>
                    ) : (
                        <><Clock className="h-3 w-3 mr-1" /> {pendingCount} pendente{pendingCount > 1 ? 's' : ''}</>
                    )}
                </Badge>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
                {reserves.map(reserve => {
                    const category = getCategoryById(reserve.categoryId);

                    return (
                        <div
                            key={reserve.id}
                            onClick={() => toggleExpenseFulfilled(reserve.id, !reserve.isFulfilled)}
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                                reserve.isFulfilled 
                                    ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900" 
                                    : "bg-background hover:bg-muted/30"
                            )}
                        >
                            <Checkbox
                                checked={reserve.isFulfilled}
                                onCheckedChange={() => {}}
                                className={cn(
                                    "h-5 w-5 pointer-events-none",
                                    reserve.isFulfilled && "data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                )}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    {category && (
                                        <div
                                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: category.color }}
                                        />
                                    )}
                                    <span className={cn(
                                        "text-sm font-medium truncate",
                                        reserve.isFulfilled && "line-through text-muted-foreground"
                                    )}>
                                        {reserve.description}
                                    </span>
                                </div>
                                {category && (
                                    <span className="text-xs text-muted-foreground">{category.name}</span>
                                )}
                            </div>
                            <span className={cn(
                                "text-sm font-semibold whitespace-nowrap",
                                reserve.isFulfilled ? "text-green-600" : "text-foreground"
                            )}>
                                {formatCurrency(reserve.amount)}
                            </span>
                        </div>
                    );
                })}

                {/* Summary footer */}
                <div className="pt-2 border-t mt-2 flex justify-between text-sm">
                    <div>
                        <span className="text-muted-foreground">Separado: </span>
                        <span className="font-medium text-green-600">{formatCurrency(fulfilledAmount)}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Pendente: </span>
                        <span className={cn(
                            "font-medium",
                            pendingAmount > 0 ? "text-yellow-600" : "text-green-600"
                        )}>
                            {formatCurrency(pendingAmount)}
                        </span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Total: </span>
                        <span className="font-bold">{formatCurrency(totalAmount)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
