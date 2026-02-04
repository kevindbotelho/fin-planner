import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
import { CurrencyInput } from '@/components/ui/currency-input';
import { Settings, Check } from 'lucide-react';
import { toast } from 'sonner';

export function FinancialGoalsWidget() {
    const {
        data,
        selectedPeriodId,
        getExpensesForPeriod,
        getGoalForCategory,
        setCategoryGoal,
        setCategoryGoalOverride
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

    // Calculate goals progress
    const categoriesGoals = data.categories.map(category => {
        const expenses = getExpensesForPeriod(selectedPeriodId);
        const categoryExpenses = expenses.filter(e => e.categoryId === category.id);
        const spent = categoryExpenses.reduce((acc, exp) => acc + exp.amount, 0);
        const goal = getGoalForCategory(category.id, selectedPeriodId);

        // Only show categories that have a goal > 0 OR have spending > 0
        if (goal === 0 && spent === 0) return null;

        const percentage = goal > 0 ? (spent / goal) * 100 : 0;

        let statusColor = 'bg-green-500';
        if (percentage > 100) statusColor = 'bg-red-500';
        else if (percentage > 75) statusColor = 'bg-yellow-500';

        return {
            ...category,
            spent,
            goal,
            percentage,
            statusColor
        };
    }).filter(Boolean) as any[]; // Type assertion for non-null

    const handleOpenDialog = (categoryId: string, currentGoal: number) => {
        setSelectedCategory(categoryId);
        setGoalAmount(currentGoal.toString());
        setSaveMode('current'); // Default to current month override
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!selectedCategory || !selectedPeriodId) return;

        try {
            const amount = parseFloat(goalAmount);

            if (saveMode === 'current') {
                await setCategoryGoalOverride(selectedCategory, selectedPeriodId, amount);
            } else {
                await setCategoryGoal(selectedCategory, amount);
            }

            setDialogOpen(false);
        } catch (error) {
            console.error(error);
        }
    };

    const categoryForDialog = data.categories.find(c => c.id === selectedCategory);

    return (
        <Card className="border-0 shadow-sm h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">Metas Financeiras</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <Settings className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                {categoriesGoals.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        <p className="text-sm">Nenhuma meta definida ou gasto registrado.</p>
                        <p className="text-xs mt-1">Clique nas configurações para definir metas.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {categoriesGoals.map((item) => (
                            <div
                                key={item.id}
                                className="space-y-1 cursor-pointer hover:bg-muted/30 p-2 rounded-lg transition-colors"
                                onClick={() => handleOpenDialog(item.id, item.goal)}
                            >
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-3 w-3 rounded-full"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <span className="font-medium">{item.name}</span>
                                    </div>
                                    <span className="text-muted-foreground">
                                        {formatCurrency(item.spent)} <span className="text-xs">de</span> {formatCurrency(item.goal)}
                                    </span>
                                </div>
                                <Progress
                                    value={item.percentage > 100 ? 100 : item.percentage}
                                    className="h-2"
                                    indicatorClassName={item.statusColor}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Definir Meta - {categoryForDialog?.name}</DialogTitle>
                        <DialogDescription>
                            Defina o limite de gastos para esta categoria.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Valor da Meta</Label>
                            <CurrencyInput
                                value={goalAmount}
                                onChange={setGoalAmount}
                                placeholder="0,00"
                            />
                        </div>

                        <RadioGroup value={saveMode} onValueChange={(v) => setSaveMode(v as 'current' | 'default')}>
                            <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSaveMode('current')}>
                                <RadioGroupItem value="current" id="r1" />
                                <div className="flex-1">
                                    <Label htmlFor="r1" className="cursor-pointer font-medium">Apenas este mês</Label>
                                    <p className="text-xs text-muted-foreground">
                                        ({currentPeriod?.name}) - Sobrescreve a meta padrão apenas para este período.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSaveMode('default')}>
                                <RadioGroupItem value="default" id="r2" />
                                <div className="flex-1">
                                    <Label htmlFor="r2" className="cursor-pointer font-medium">Todos os meses (Padrão)</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Define o novo valor padrão para todos os meses futuros.
                                    </p>
                                </div>
                            </div>
                        </RadioGroup>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave}>Salvar Meta</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
