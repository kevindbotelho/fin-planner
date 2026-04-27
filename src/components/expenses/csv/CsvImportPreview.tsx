import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ParsedCsvRow, reconcileExpenses, ReconciledCsvRow, beautifyTransactionTitle } from "@/utils/csvImport";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FilePlus2, CheckCircle2, HelpCircle } from "lucide-react";

interface CsvImportPreviewProps {
    isOpen: boolean;
    onClose: () => void;
    parsedData: ParsedCsvRow[];
}

export interface ExtendedReconciledCsvRow extends ReconciledCsvRow {
    actionType: 'new' | 'link';
    expenseType: 'variable' | 'fixed';
    linkedExpenseId?: string;
    linkedTemplateId?: string;
    isMatchedPair?: boolean;
}

export function CsvImportPreview({ isOpen, onClose, parsedData }: CsvImportPreviewProps) {
    const { data: financeData, addBulkExpenses, linkExpenseToFixed, getBillingPeriodForDate } = useFinance();
    const [reconciledData, setReconciledData] = useState<ExtendedReconciledCsvRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasReconciled, setHasReconciled] = useState(false);

    // Show ALL fixed expenses for the current period — including those already linked (originalTitle set)
    // This allows re-linking when the card changes (e.g. Crunchyroll moved from Nubank to Inter)
    const linkableFixedExpenses = financeData.expenses
        .filter(e => e.fixedTemplateId != null)
        .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

    React.useEffect(() => {
        if (isOpen && parsedData.length > 0) {
            const reconciled = reconcileExpenses(parsedData, financeData.expenses, financeData.fixedTemplates);
            setReconciledData(reconciled.map(r => ({
                ...r,
                actionType: 'new' as const,
                expenseType: 'variable' as const,
            })));
            setHasReconciled(true);
        } else {
            setReconciledData([]);
            setHasReconciled(false);
        }
    }, [isOpen, parsedData, financeData.expenses]);

    const handleCategoryChange = (index: number, categoryId: string) => {
        setReconciledData(prev => {
            const newData = [...prev];
            newData[index] = { ...newData[index], categoryId, subcategoryId: undefined };
            return newData;
        });
    };

    const handleSubcategoryChange = (index: number, subcategoryId: string) => {
        setReconciledData(prev => {
            const newData = [...prev];
            newData[index] = { ...newData[index], subcategoryId };
            return newData;
        });
    };

    const handleActionTypeChange = (index: number, type: 'new' | 'link') => {
        setReconciledData(prev => {
            const newData = [...prev];
            newData[index] = { ...newData[index], actionType: type };
            if (type === 'link') {
                newData[index].categoryId = undefined;
                newData[index].subcategoryId = undefined;
                newData[index].expenseType = 'variable';
            } else {
                newData[index].linkedExpenseId = undefined;
                newData[index].linkedTemplateId = undefined;
            }
            return newData;
        });
    }

    const handleExpenseTypeChange = (index: number, expenseType: 'variable' | 'fixed') => {
        setReconciledData(prev => {
            const newData = [...prev];
            newData[index] = { ...newData[index], expenseType };
            return newData;
        });
    }

    const handleLinkedExpenseChange = (index: number, expenseId: string) => {
        const exp = financeData.expenses.find(e => e.id === expenseId);
        setReconciledData(prev => {
            const newData = [...prev];
            newData[index] = {
                ...newData[index],
                linkedExpenseId: expenseId,
                linkedTemplateId: exp?.fixedTemplateId,
                categoryId: exp?.categoryId,
                subcategoryId: exp?.subcategoryId,
            };
            return newData;
        });
    };

    const handleToggleIgnore = (index: number) => {
        setReconciledData(prev => {
            const newData = [...prev];
            newData[index] = {
                ...newData[index],
                ignored: !newData[index].ignored,
            };
            return newData;
        });
    };

    const handleSave = async () => {
        const toProcess = reconciledData.filter(row => !row.ignored);

        // Validation for 'new'
        const newExpenses = toProcess.filter(r => r.actionType === 'new');
        const missingCategories = newExpenses.filter(row => !row.categoryId);
        if (missingCategories.length > 0) {
            toast.error(`Selecione uma categoria para as ${missingCategories.length} novas despesas.`);
            return;
        }

        // Validation for 'link'
        const linkExpenses = toProcess.filter(r => r.actionType === 'link');
        const missingLinks = linkExpenses.filter(row => !row.linkedExpenseId || !row.linkedTemplateId);
        if (missingLinks.length > 0) {
            toast.error(`Selecione a despesa correspondente para vincular as despesas fixas.`);
            return;
        }

        if (toProcess.length === 0) {
            toast.error("Nenhuma despesa selecionada para importação.");
            return;
        }

        setIsProcessing(true);
        try {
            const promises: Promise<void>[] = [];

            // 1. Add bulk new expenses (variable + fixed)
            const createExpenses = toProcess.filter(r => r.actionType === 'new');
            if (createExpenses.length > 0) {
                promises.push(addBulkExpenses(createExpenses.map(row => ({
                    description: beautifyTransactionTitle(row.title),
                    amount: Math.abs(row.amount),
                    purchaseDate: row.date,
                    categoryId: row.categoryId!,
                    subcategoryId: row.subcategoryId,
                    type: row.expenseType,
                    originalTitle: row.title,
                    bankOrigin: row.bankOrigin,
                }))));
            }

            // 2. Link each fixed expense
            for (const row of linkExpenses) {
                promises.push(linkExpenseToFixed(row.linkedExpenseId!, row.linkedTemplateId!, row.title, row.date, row.amount));
            }

            await Promise.all(promises);
            onClose();
        } catch (error) {
            console.error("Error summarizing imports:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!hasReconciled) return null;

    const validToImportCount = reconciledData.filter(r => !r.ignored).length;
    const duplicateCount = reconciledData.filter(r => r.isDuplicate).length;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[95vw] lg:max-w-6xl h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <FilePlus2 className="h-5 w-5 text-primary" />
                        Revisão de Importação CSV
                    </DialogTitle>
                    <DialogDescription>
                        Encontramos {parsedData.length} transações no arquivo. Revise as categorias e deduplicações.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {duplicateCount > 0 && (
                        <div className="px-6 py-2 bg-muted/50 border-b flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>Identificamos <strong>{duplicateCount}</strong> transações que já existem no seu sistema. Elas foram ocultadas por padrão.</span>
                        </div>
                    )}

                    <ScrollArea className="flex-1">
                        <div className="p-4 md:p-6 min-w-[max-content]">
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                                        <tr className="border-b">
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground w-[50px]">Imp.</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground w-[100px]">Data</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground w-[80px]">Banco</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground max-w-[200px]">Descrição (Banco)</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground w-[120px]">Valor</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground w-[160px]">
                                                <div className="flex items-center gap-1">
                                                    Ação
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="max-w-[200px] text-xs">
                                                                <p>"Vincular" serve para despesas fixas já projetadas. Associa o lançamento do banco à despesa que o sistema gerou pro mês.</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground w-[110px]">Tipo</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground w-[200px]">Categoria / Vínculo</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground w-[180px]">Subcategoria</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reconciledData.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="h-24 text-center text-muted-foreground">
                                                    Nenhuma transação encontrada no arquivo.
                                                </td>
                                            </tr>
                                        ) : (
                                            reconciledData.map((row, index) => {
                                                const isIgnored = row.ignored;
                                                const isDuplicate = row.isDuplicate;

                                                const selectedCat = financeData.categories.find(c => c.id === row.categoryId);

                                                // Only show linkable expenses that belong to the SAME billing period as this CSV row
                                                const rowPeriod = getBillingPeriodForDate(row.date);
                                                const validLinkableExpenses = linkableFixedExpenses.filter(exp => {
                                                    if (!rowPeriod) return true; // If somehow row has no period, show all (fallback)
                                                    const expPeriod = getBillingPeriodForDate(exp.purchaseDate);
                                                    return expPeriod?.id === rowPeriod.id;
                                                });

                                                return (
                                                    <tr key={`csv-row-${index}`} className={`border-b transition-colors hover:bg-muted/50 ${isIgnored ? 'opacity-50 bg-muted/30' : ''}`}>
                                                        <td className="p-4 align-middle">
                                                            <Checkbox
                                                                checked={!isIgnored}
                                                                onCheckedChange={() => handleToggleIgnore(index)}
                                                                disabled={isDuplicate && !isIgnored}
                                                            />
                                                        </td>
                                                        <td className="p-4 align-middle">{format(new Date(`${row.date}T12:00:00`), "dd/MM", { locale: ptBR })}</td>
                                                        <td className="p-4 align-middle">
                                                            {row.bankOrigin ? (
                                                                <Badge variant="outline" className={row.bankOrigin === 'Nubank' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-orange-100 text-orange-700 border-orange-200'}>
                                                                    {row.bankOrigin}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">—</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 align-middle font-medium truncate max-w-[200px]" title={row.title}>{beautifyTransactionTitle(row.title)}</td>
                                                        <td className={`p-4 align-middle font-semibold ${row.amount < 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.amount)}
                                                        </td>
                                                        <td className="p-4 align-middle">
                                                            {isDuplicate ? (
                                                                <Badge variant="secondary" className="bg-amber-100 text-amber-800" title={row.duplicateReason}>Já Existe</Badge>
                                                            ) : (
                                                                <div className="flex flex-col gap-1">
                                                                    <Select
                                                                        value={row.actionType}
                                                                        onValueChange={(val: 'new' | 'link') => handleActionTypeChange(index, val)}
                                                                        disabled={isIgnored}
                                                                    >
                                                                        <SelectTrigger className="h-8">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="new">Nova</SelectItem>
                                                                            <SelectItem value="link">Vincular</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                    {row.isNegative && (
                                                                        <span className="text-[10px] text-muted-foreground leading-tight px-1 font-medium">Entrada/Estorno</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className={`p-4 align-middle ${row.actionType === 'link' || isDuplicate ? 'opacity-30' : ''}`}>
                                                            {!isDuplicate && row.actionType === 'new' && !isIgnored ? (
                                                                <Select
                                                                    value={row.expenseType}
                                                                    onValueChange={(val: 'variable' | 'fixed') => handleExpenseTypeChange(index, val)}
                                                                >
                                                                    <SelectTrigger className="h-8">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="variable">Variável</SelectItem>
                                                                        <SelectItem value="fixed">Fixa</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            ) : !isDuplicate ? (
                                                                <span className="text-xs text-muted-foreground italic px-1">—</span>
                                                            ) : null}
                                                        </td>
                                                        <td className="p-4 align-middle">
                                                            {!isIgnored && !isDuplicate && row.actionType === 'new' && (
                                                                <Select
                                                                    value={row.categoryId || ""}
                                                                    onValueChange={(val) => handleCategoryChange(index, val)}
                                                                >
                                                                    <SelectTrigger className={`h-8 w-full ${!row.categoryId ? 'border-destructive ring-destructive' : ''}`}>
                                                                        <SelectValue placeholder="Categoria..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {financeData.categories.map(cat => (
                                                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                            {!isIgnored && !isDuplicate && row.actionType === 'link' && (
                                                                <Select
                                                                    value={row.linkedExpenseId || ""}
                                                                    onValueChange={(val) => handleLinkedExpenseChange(index, val)}
                                                                >
                                                                    <SelectTrigger className={`h-8 w-full ${!row.linkedExpenseId ? 'border-destructive ring-destructive' : ''}`}>
                                                                        <SelectValue placeholder="Selecione..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {validLinkableExpenses.map(exp => {
                                                                            const template = financeData.fixedTemplates.find(t => t.id === exp.fixedTemplateId);
                                                                            const alreadyLinked = !!exp.originalTitle;
                                                                            return (
                                                                                <SelectItem key={exp.id} value={exp.id}>
                                                                                    {template?.description || exp.description}
                                                                                    {' '}({format(parseISO(exp.purchaseDate), 'dd/MM')})
                                                                                    {alreadyLinked && (
                                                                                        <span className="ml-1 text-[10px] text-amber-600 font-medium">[re-vincular]</span>
                                                                                    )}
                                                                                </SelectItem>
                                                                            )
                                                                        })}
                                                                        {validLinkableExpenses.length === 0 && (
                                                                            <SelectItem value="none" disabled>Nenhuma despesa pendente</SelectItem>
                                                                        )}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        </td>
                                                        <td className="p-4 align-middle">
                                                            {!isIgnored && !isDuplicate && row.actionType === 'new' && selectedCat && selectedCat.subcategories.length > 0 && (
                                                                <Select
                                                                    value={row.subcategoryId || "none"}
                                                                    onValueChange={(val) => handleSubcategoryChange(index, val === "none" ? "" : val)}
                                                                >
                                                                    <SelectTrigger className="h-8 w-full [&>span]:text-left">
                                                                        <SelectValue placeholder="Nenhuma subcategoria..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="none" className="text-muted-foreground italic text-left">Nenhuma subcategoria</SelectItem>
                                                                        {selectedCat.subcategories.map(sub => (
                                                                            <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter className="p-6 border-t bg-muted/20 flex sm:justify-between items-center w-full">
                    <div className="text-sm text-muted-foreground flex-1">
                        <strong>{validToImportCount}</strong> transações prontas para processar
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={isProcessing || validToImportCount === 0}>
                            {isProcessing ? "Processando..." : "Salvar Importação"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
