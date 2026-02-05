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

export function FinancialGoalsWidget() {
    const navigate = useNavigate();
    const {
        data,
        selectedPeriodId,
        getExpensesForPeriod,
        getGoalForCategory,
        setCategoryGoal,
        setCategoryGoalOverride,
        deleteCategoryGoalOverride,
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
        const goalPercentage = getGoalForCategory(category.id, selectedPeriodId);

        // Hide categories without a defined goal
        if (goalPercentage === 0) return null;

        const goalValue = totalIncome * (goalPercentage / 100);
        const percentage = goalValue > 0 ? (spent / goalValue) * 100 : 0;

        let statusColor = 'bg-green-500';
        if (percentage > 100) statusColor = 'bg-red-500';
        else if (percentage > 75) statusColor = 'bg-yellow-500';

        return {
            ...category,
            spent,
            goalPercentage,
            goalValue,
            percentage,
            statusColor
        };
    }).filter(Boolean) as any[]; // Type assertion for non-null

    const handleOpenDialog = (categoryId: string, currentPercentage: number) => {
        setSelectedCategory(categoryId);
        // If 0, show empty string to display placeholder
        setGoalAmount(currentPercentage > 0 ? currentPercentage.toString() : '');
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
                // When setting default (all months), we want this to be the source of truth.
                // So we update the default AND remove any specific override for this month
                // that might be masking the new default.
                await setCategoryGoal(selectedCategory, amount);
                await deleteCategoryGoalOverride(selectedCategory, selectedPeriodId);
            }

            setDialogOpen(false);
        } catch (error) {
            console.error(error);
        }
    };

    const categoryForDialog = data.categories.find(c => c.id === selectedCategory);

    return (
        <Card className="border-0 shadow-sm flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">Metas Financeiras</CardTitle>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => navigate('/configuracoes?tab=goals')}
                >
                    <Settings className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                {categoriesGoals.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        <p className="text-sm">Nenhuma meta definida.</p>
                        <p className="text-xs mt-1 cursor-pointer hover:underline text-primary" onClick={() => navigate('/configuracoes?tab=goals')}>
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
                                    className="space-y-1 cursor-pointer hover:bg-muted/30 p-2 rounded-lg transition-colors group"
                                    onClick={() => handleOpenDialog(item.id, item.goalPercentage)}
                                >
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-3 w-3 rounded-full"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span className="font-medium">{item.name}</span>
                                            {isOverridden && (
                                                <Badge variant="secondary" className="h-4 px-1 text-[9px] pointer-events-none">
                                                    Mensal
                                                </Badge>
                                            )}
                                            <span className="text-xs text-muted-foreground">({item.goalPercentage.toFixed(0)}%)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-xs">
                                                {formatCurrency(item.spent)} / {formatCurrency(item.goalValue)}
                                            </span>
                                            <span className={cn(
                                                "text-xs font-bold w-10 text-right",
                                                item.percentage > 100 ? "text-red-500" :
                                                    item.percentage > 75 ? "text-yellow-600" : "text-green-600"
                                            )}>
                                                {item.percentage.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                    <Progress
                                        value={item.percentage > 100 ? 100 : item.percentage}
                                        className="h-2"
                                        indicatorClassName={item.statusColor}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Definir Meta - {categoryForDialog?.name}</DialogTitle>
                        <DialogDescription>
                            Defina a porcentagem da renda para esta categoria.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Porcentagem (%)</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={goalAmount}
                                    onChange={(e) => {
                                        let val = parseFloat(e.target.value);
                                        if (val > 100) val = 100;
                                        setGoalAmount(e.target.value);
                                    }}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    placeholder="0"
                                    className="pr-6"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                            </div>
                        </div>

                        <RadioGroup value={saveMode} onValueChange={(v) => setSaveMode(v as 'current' | 'default')}>
                            <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSaveMode('current')}>
                                <RadioGroupItem value="current" id="r1" />
                                <div className="flex-1">
                                    <Label htmlFor="r1" className="cursor-pointer font-medium">Apenas este mês</Label>
                                    <p className="text-xs text-muted-foreground">
                                        ({currentPeriod?.name}) - Meta temporária.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSaveMode('default')}>
                                <RadioGroupItem value="default" id="r2" />
                                <div className="flex-1">
                                    <Label htmlFor="r2" className="cursor-pointer font-medium">Todos os meses (Padrão)</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Nova meta padrão.
                                    </p>
                                </div>
                            </div>
                        </RadioGroup>
                    </div>

                    <DialogFooter className="flex justify-between sm:justify-between">
                        {selectedCategory && data.goalOverrides.some(o => o.categoryId === selectedCategory && o.billingPeriodId === selectedPeriodId) ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                    if (!selectedCategory || !selectedPeriodId) return;
                                    try {
                                        await deleteCategoryGoalOverride(selectedCategory, selectedPeriodId);
                                        toast.success("Meta restaurada para o padrão");
                                        setDialogOpen(false);
                                    } catch (error) {
                                        console.error(error);
                                    }
                                }}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Restaurar Padrão
                            </Button>
                        ) : (
                            <div /> /* Spacer if no revert button */
                        )}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave}>Salvar Meta</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
