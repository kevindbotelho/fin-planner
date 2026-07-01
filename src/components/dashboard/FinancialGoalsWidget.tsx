import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Settings, Check, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { CurrencyInput } from '@/components/ui/currency-input';

export function FinancialGoalsWidget() {
    const navigate = useNavigate();
    const {
        data,
        selectedPeriodId,
        getExpensesForPeriod,
        getGoalForCategory,
        setCategoryGoalOverride,
        setCategoryGoals,
        getIncomeForPeriod
    } = useFinance();

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [goalAmount, setGoalAmount] = useState('');
    const [saveMode, setSaveMode] = useState<'current' | 'default'>('current');
    const [dialogOpen, setDialogOpen] = useState(false);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const currentPeriod = data.billingPeriods.find(p => p.id === selectedPeriodId);
    if (!currentPeriod || !selectedPeriodId) return null;

    const incomeObj = getIncomeForPeriod(selectedPeriodId);
    const totalIncome = incomeObj ? (incomeObj.salary + incomeObj.extra) : 0;

    // Calculate goals progress
    const categoriesGoals = data.categories.map(category => {
        const expenses = getExpensesForPeriod(selectedPeriodId);
        const categoryExpenses = expenses.filter(e => e.categoryId === category.id);
        const spent = categoryExpenses.reduce((acc, exp) => acc + exp.amount, 0);
        const goalValue = getGoalForCategory(category.id, selectedPeriodId);

        // Hide categories without a defined goal
        if (goalValue === 0) return null;

        const goalPercentage = totalIncome > 0 ? (goalValue / totalIncome) * 100 : 0;
        const percentage = goalValue > 0 ? (spent / goalValue) * 100 : 0;

        let statusColor = 'bg-emerald-500 dark:bg-emerald-400';
        if (percentage > 100) statusColor = 'bg-rose-500 dark:bg-rose-400';
        else if (percentage > 75) statusColor = 'bg-amber-500 dark:bg-amber-400';

        return {
            ...category,
            spent,
            goalPercentage,
            goalValue,
            percentage,
            statusColor
        };
    }).filter(Boolean) as any[]; // Type assertion for non-null

    const handleOpenDialog = (categoryId: string, currentGoalValue: number) => {
        setSelectedCategory(categoryId);
        // If 0, show empty string to display placeholder
        setGoalAmount(currentGoalValue > 0 ? currentGoalValue.toString() : '');
        setSaveMode('current'); // Default to current month override
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!selectedCategory || !selectedPeriodId) return;

        try {
            // Treat empty string or NaN as 0
            const amount = goalAmount === '' || isNaN(parseFloat(goalAmount)) ? 0 : parseFloat(goalAmount);

            if (saveMode === 'current') {
                await setCategoryGoalOverride(selectedCategory, selectedPeriodId, amount);
            } else {
                // When setting default (all months), use the robust setCategoryGoals 
                // which protects past history and overrides future months properly
                await setCategoryGoals([{ categoryId: selectedCategory, amount }], selectedPeriodId);
            }

            setDialogOpen(false);
        } catch (error) {
            console.error(error);
        }
    };

    const categoryForDialog = data.categories.find(c => c.id === selectedCategory);

    return (
        <Card className="liquid-glass liquid-glass-bevel border-0 shadow-sm flex flex-col h-full rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100">Metas Financeiras</CardTitle>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-brand-500 dark:hover:text-brand-400 rounded-full hover:bg-slate-100/50 dark:hover:bg-slate-900/50"
                    onClick={() => navigate('/configuracoes?tab=goals')}
                >
                    <Settings className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {categoriesGoals.length === 0 ? (
                    <div className="text-center text-slate-400 dark:text-slate-500 py-8 font-medium">
                        <p className="text-xs">Nenhuma meta definida.</p>
                        <p className="text-xs mt-1 cursor-pointer hover:underline text-brand-500" onClick={() => navigate('/configuracoes?tab=goals')}>
                            Configure suas metas nas configurações.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {categoriesGoals.map((item) => {
                            const isOverridden = data.goalOverrides.some(
                                o => o.categoryId === item.id && o.billingPeriodId === selectedPeriodId
                            );

                            return (
                                <div
                                    key={item.id}
                                    className="space-y-1.5 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900/40 p-2.5 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-200/30 dark:hover:border-white/5 group"
                                    onClick={() => handleOpenDialog(item.id, item.goalValue)}
                                >
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-700 dark:text-slate-200">{item.name}</span>
                                            {isOverridden && (
                                                <Badge className="h-4 px-1.5 text-[8px] font-bold tracking-wider uppercase bg-brand-500/10 text-brand-600 dark:text-brand-400 border-0 pointer-events-none">
                                                    Mensal
                                                </Badge>
                                            )}
                                            <span className="text-[10px] text-slate-400 font-mono">({item.goalPercentage.toFixed(0)}%)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                                                {formatCurrency(item.spent)} / {formatCurrency(item.goalValue)}
                                            </span>
                                            <span className={cn(
                                                "text-xs font-bold w-10 text-right",
                                                item.percentage > 100 ? "text-rose-500" :
                                                    item.percentage > 75 ? "text-amber-500" : "text-emerald-500"
                                            )}>
                                                {item.percentage.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                    <Progress
                                        value={item.percentage > 100 ? 100 : item.percentage}
                                        className="h-1.5 bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden"
                                        indicatorClassName={cn("rounded-full", item.statusColor)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md liquid-glass border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-md">
                    <DialogHeader>
                        <DialogTitle className="text-slate-800 dark:text-slate-100 font-manrope font-bold">Definir Meta - {categoryForDialog?.name}</DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                            Defina o valor limite (R$ ou %) para esta categoria.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Meta Financeira</Label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <CurrencyInput
                                        value={goalAmount}
                                        onChange={(val) => setGoalAmount(val)}
                                        className="liquid-glass border-slate-200 dark:border-slate-800 rounded-xl"
                                    />
                                </div>
                                <span className="text-slate-400 font-bold">=</span>
                                <div className="relative w-24">
                                    <CurrencyInput
                                        value={(totalIncome > 0 && parseFloat(goalAmount) > 0) ? ((parseFloat(goalAmount) / totalIncome) * 100).toFixed(2) : ''}
                                        onChange={(val) => {
                                            let p = parseFloat(val) || 0;
                                            const newAmount = (p / 100) * totalIncome;
                                            setGoalAmount(newAmount.toString());
                                        }}
                                        className="pr-6 liquid-glass border-slate-200 dark:border-slate-800 rounded-xl"
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">%</span>
                                </div>
                            </div>
                        </div>

                        <RadioGroup value={saveMode} onValueChange={(v) => setSaveMode(v as 'current' | 'default')} className="space-y-2">
                            <div className="flex items-center space-x-2 border border-slate-200/50 dark:border-slate-800/50 p-3 rounded-xl cursor-pointer hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-all duration-200" onClick={() => setSaveMode('current')}>
                                <RadioGroupItem value="current" id="r1" className="border-slate-300 text-brand-500" />
                                <div className="flex-1">
                                    <Label htmlFor="r1" className="cursor-pointer font-semibold text-xs text-slate-700 dark:text-slate-200">Apenas este período</Label>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        ({currentPeriod?.name})
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 border border-slate-200/50 dark:border-slate-800/50 p-3 rounded-xl cursor-pointer hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-all duration-200" onClick={() => setSaveMode('default')}>
                                <RadioGroupItem value="default" id="r2" className="border-slate-300 text-brand-500" />
                                <div className="flex-1">
                                    <Label htmlFor="r2" className="cursor-pointer font-semibold text-xs text-slate-700 dark:text-slate-200">Este período e todos os próximos</Label>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Define a meta padrão para a categoria</p>
                                </div>
                            </div>
                        </RadioGroup>
                    </div>

                    <DialogFooter>
                        <div className="flex gap-2 w-full justify-end">
                            <Button variant="outline" className="rounded-xl h-[38px] text-xs font-semibold uppercase tracking-wider border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button className="rounded-xl h-[38px] text-xs font-semibold uppercase tracking-wider bg-brand-500 text-white hover:bg-brand-600 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-600 transition-colors shadow-md shadow-brand-500/10" onClick={handleSave}>Salvar Meta</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
