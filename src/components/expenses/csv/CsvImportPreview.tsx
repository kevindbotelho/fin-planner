import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ParsedCsvRow, ReconciledCsvRow, ExtendedReconciledCsvRow, beautifyTransactionTitle } from "@/utils/csvImport";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FilePlus2, CheckCircle2, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
 
interface CsvImportPreviewProps {
    isOpen: boolean;
    onClose: () => void;
}

const classificationLabels = {
    exact_history: 'Histórico exato',
    bank_taxonomy: 'Categoria do banco',
    fuzzy_history: 'Histórico semelhante',
} as const;

const confidenceLabels = {
    high: 'alta',
    medium: 'média',
    low: 'baixa',
} as const;

export function CsvImportPreview({ isOpen, onClose }: CsvImportPreviewProps) {
    const { 
        data: financeData, 
        addBulkExpenses, 
        linkExpenseToFixed, 
        getBillingPeriodForDate,
        csvParsedData: parsedData,
        csvReconciledData: reconciledData,
        setCsvReconciledData: setReconciledData
    } = useFinance();
    const [isProcessing, setIsProcessing] = useState(false);

    // Show ALL fixed expenses for the current period — including those already linked (originalTitle set)
    // This allows re-linking when the card changes (e.g. Crunchyroll moved from Nubank to Inter)
    const linkableFixedExpenses = financeData.expenses
        .filter(e => e.fixedTemplateId != null)
        .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

    const handleCategoryChange = (index: number, categoryId: string) => {
        setReconciledData(prev => {
            const newData = [...prev];
            newData[index] = {
                ...newData[index],
                categoryId,
                subcategoryId: undefined,
                classificationConfidence: undefined,
                classificationSource: undefined,
                classificationExplanation: undefined,
                classificationReviewRequired: undefined,
            };
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
        const activeExpenses = reconciledData.filter(row => !row.ignored);
        const ignoredExpenses = reconciledData.filter(row => row.ignored && !row.isDuplicate && !row.isMatchedPair);

        // Validation for 'new' active expenses
        const newActiveExpenses = activeExpenses.filter(r => r.actionType === 'new');
        const missingCategories = newActiveExpenses.filter(row => !row.categoryId);
        if (missingCategories.length > 0) {
            toast.error(`Selecione uma categoria para as ${missingCategories.length} novas despesas.`);
            return;
        }

        // Validation for 'link' active expenses
        const linkExpenses = activeExpenses.filter(r => r.actionType === 'link');
        const missingLinks = linkExpenses.filter(row => !row.linkedExpenseId || !row.linkedTemplateId);
        if (missingLinks.length > 0) {
            toast.error(`Selecione a despesa correspondente para vincular as despesas fixas.`);
            return;
        }

        if (activeExpenses.length === 0 && ignoredExpenses.length === 0) {
            toast.error("Nenhuma despesa para importação.");
            return;
        }

        setIsProcessing(true);
        try {
            const promises: Promise<void>[] = [];

            // Find default category for ignored expenses if needed
            const defaultCategory = financeData.categories.find(c => c.name.toLowerCase() === 'outros') || financeData.categories[0];
            const defaultCategoryId = defaultCategory?.id;

            // Combine active and ignored new expenses to insert in bulk
            const bulkInserts = [
                ...activeExpenses.filter(r => r.actionType === 'new').map(row => ({
                    description: beautifyTransactionTitle(row.title),
                    amount: Math.abs(row.amount),
                    purchaseDate: row.date,
                    categoryId: row.categoryId!,
                    subcategoryId: row.subcategoryId,
                    type: row.expenseType,
                    originalTitle: row.title,
                    bankOrigin: row.bankOrigin,
                    isIgnored: false,
                })),
                ...ignoredExpenses.map(row => ({
                    description: beautifyTransactionTitle(row.title),
                    amount: Math.abs(row.amount),
                    purchaseDate: row.date,
                    categoryId: row.categoryId || defaultCategoryId!,
                    subcategoryId: row.subcategoryId,
                    type: row.expenseType || 'variable',
                    originalTitle: row.title,
                    bankOrigin: row.bankOrigin,
                    isIgnored: true,
                }))
            ];

            if (bulkInserts.length > 0) {
                promises.push(addBulkExpenses(bulkInserts));
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

    const validToImportCount = reconciledData.filter(r => !r.ignored).length;
    const ignoredExpensesToImportCount = reconciledData.filter(row => row.ignored && !row.isDuplicate && !row.isMatchedPair).length;
    const duplicateCount = reconciledData.filter(r => r.isDuplicate).length;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[98vw] md:max-w-[95vw] xl:max-w-[1350px] h-[90vh] md:h-[85vh] flex flex-col p-0 gap-0 bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-md">
                <DialogHeader className="p-6 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
                    <DialogTitle className="flex items-center gap-2 text-base font-bold font-manrope tracking-tight text-slate-900 dark:text-white">
                        <FilePlus2 className="h-4.5 w-4.5 text-brand-500" />
                        Revisão de Importação CSV
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-650 dark:text-slate-200 mt-1 font-semibold">
                        Encontramos {parsedData.length} transações no arquivo. Revise as categorias e deduplicações.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {duplicateCount > 0 && (
                        <div className="px-6 py-2.5 bg-amber-500/10 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Identificamos <strong>{duplicateCount}</strong> transações que já existem no seu sistema. Elas foram ocultadas por padrão.</span>
                        </div>
                    )}

                    <ScrollArea className="flex-1">
                        <div className="p-4 md:p-6 min-w-[max-content]">
                            <div className="rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden bg-white/70 dark:bg-slate-900/60 shadow-sm">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-100/80 dark:bg-slate-900/80 sticky top-0 z-10">
                                        <tr className="border-b border-slate-200/50 dark:border-slate-800/50">
                                            <th className="h-10 px-4 text-left text-[10px] font-extrabold tracking-wider uppercase text-slate-700 dark:text-slate-200 font-manrope w-[50px]">Imp.</th>
                                            <th className="h-10 px-4 text-left text-[10px] font-extrabold tracking-wider uppercase text-slate-700 dark:text-slate-200 font-manrope w-[100px]">Data</th>
                                            <th className="h-10 px-4 text-left text-[10px] font-extrabold tracking-wider uppercase text-slate-700 dark:text-slate-200 font-manrope w-[80px]">Banco</th>
                                            <th className="h-10 px-4 text-left text-[10px] font-extrabold tracking-wider uppercase text-slate-700 dark:text-slate-200 font-manrope max-w-[200px]">Descrição (Banco)</th>
                                            <th className="h-10 px-4 text-left text-[10px] font-extrabold tracking-wider uppercase text-slate-700 dark:text-slate-200 font-manrope w-[120px]">Valor</th>
                                            <th className="h-10 px-4 text-left text-[10px] font-extrabold tracking-wider uppercase text-slate-700 dark:text-slate-200 font-manrope w-[160px]">
                                                <div className="flex items-center gap-1">
                                                    Ação
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <HelpCircle className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300 cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl text-[10px] font-semibold text-slate-650 dark:text-slate-200 max-w-[220px]">
                                                                <p>"Vincular" serve para despesas fixas já projetadas. Associa o lançamento do banco à despesa que o sistema gerou pro mês.</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </th>
                                            <th className="h-10 px-4 text-left text-[10px] font-extrabold tracking-wider uppercase text-slate-700 dark:text-slate-200 font-manrope w-[110px]">Tipo</th>
                                            <th className="h-10 px-4 text-left text-[10px] font-extrabold tracking-wider uppercase text-slate-700 dark:text-slate-200 font-manrope w-[200px]">Categoria / Vínculo</th>
                                            <th className="h-10 px-4 text-left text-[10px] font-extrabold tracking-wider uppercase text-slate-700 dark:text-slate-200 font-manrope w-[180px]">Subcategoria</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reconciledData.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="h-24 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
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
                                                    <tr key={`csv-row-${index}`} className={cn(
                                                      "border-b border-slate-200/50 dark:border-slate-800/50 transition-colors hover:bg-slate-100/40 dark:hover:bg-slate-900/40",
                                                      isIgnored && "opacity-50 bg-slate-100/10 dark:bg-slate-900/10"
                                                    )}>
                                                        <td className="p-4 align-middle">
                                                            <Checkbox
                                                                checked={!isIgnored}
                                                                onCheckedChange={() => handleToggleIgnore(index)}
                                                                className="h-5 w-5 pointer-events-auto rounded-md border-slate-300 dark:border-slate-800 data-[state=checked]:bg-brand-500 data-[state=checked]:border-brand-500"
                                                            />
                                                        </td>
                                                        <td className="p-4 align-middle text-[10px] font-mono text-slate-600 dark:text-slate-350 font-bold">
                                                          {format(new Date(`${row.date}T12:00:00`), "dd/MM", { locale: ptBR })}
                                                        </td>
                                                        <td className="p-4 align-middle">
                                                            {row.bankOrigin ? (
                                                                <Badge className={cn(
                                                                  "border-0 text-[10px] font-semibold rounded-md pointer-events-none px-2 py-0.5",
                                                                  row.bankOrigin === 'Nubank' 
                                                                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' 
                                                                    : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                                                                )}>
                                                                    {row.bankOrigin}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-slate-400 dark:text-slate-650 text-xs font-mono">—</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 align-middle text-xs font-semibold text-slate-850 dark:text-slate-50 truncate max-w-[200px]" title={row.title}>
                                                          {beautifyTransactionTitle(row.title)}
                                                        </td>
                                                        <td className={cn(
                                                          "p-4 align-middle text-xs font-mono font-bold whitespace-nowrap",
                                                          row.amount < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                                        )}>
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.amount)}
                                                        </td>
                                                        <td className="p-4 align-middle">
                                                            {isDuplicate ? (
                                                                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0 text-[10px] font-semibold rounded-md pointer-events-none px-2 py-0.5" title={row.duplicateReason}>Já Existe</Badge>
                                                            ) : (
                                                                <div className="flex flex-col gap-1">
                                                                    <Select
                                                                        value={row.actionType}
                                                                        onValueChange={(val: 'new' | 'link') => handleActionTypeChange(index, val)}
                                                                        disabled={isIgnored}
                                                                    >
                                                                        <SelectTrigger className="h-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors disabled:opacity-40 shadow-sm">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl backdrop-blur-md shadow-lg">
                                                                            <SelectItem value="new" className="focus:bg-slate-100/50 dark:focus:bg-slate-900/50 rounded-lg text-xs font-medium">Nova</SelectItem>
                                                                            <SelectItem value="link" className="focus:bg-slate-100/50 dark:focus:bg-slate-900/50 rounded-lg text-xs font-medium">Vincular</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                    {row.isNegative && (
                                                                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold px-1">Entrada/Estorno</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className={cn("p-4 align-middle", (row.actionType === 'link' || isDuplicate) && 'opacity-30')}>
                                                            {!isDuplicate && row.actionType === 'new' && !isIgnored ? (
                                                                <Select
                                                                    value={row.expenseType}
                                                                    onValueChange={(val: 'variable' | 'fixed') => handleExpenseTypeChange(index, val)}
                                                                >
                                                                    <SelectTrigger className="h-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors shadow-sm">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl backdrop-blur-md shadow-lg">
                                                                        <SelectItem value="variable" className="focus:bg-slate-100/50 dark:focus:bg-slate-900/50 rounded-lg text-xs font-medium">Variável</SelectItem>
                                                                        <SelectItem value="fixed" className="focus:bg-slate-100/50 dark:focus:bg-slate-900/50 rounded-lg text-xs font-medium">Fixa</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            ) : !isDuplicate ? (
                                                                <span className="text-slate-400 dark:text-slate-600 text-xs font-mono px-1">—</span>
                                                            ) : null}
                                                        </td>
                                                        <td className="p-4 align-middle">
                                                            {!isIgnored && !isDuplicate && row.actionType === 'new' && (
                                                                <div className="space-y-1.5">
                                                                    <Select
                                                                        value={row.categoryId || ""}
                                                                        onValueChange={(val) => handleCategoryChange(index, val)}
                                                                    >
                                                                        <SelectTrigger className={cn(
                                                                          "h-8 w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors shadow-sm",
                                                                          !row.categoryId ? 'border-rose-500 ring-rose-500 dark:border-rose-500' : 'border-slate-200 dark:border-slate-800'
                                                                        )}>
                                                                            <SelectValue placeholder="Categoria..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl backdrop-blur-md shadow-lg">
                                                                            {financeData.categories.map(cat => (
                                                                                <SelectItem key={cat.id} value={cat.id} className="focus:bg-slate-100/50 dark:focus:bg-slate-900/50 rounded-lg text-xs font-medium">{cat.name}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    {row.classificationConfidence && row.classificationSource && (
                                                                        <TooltipProvider delayDuration={200}>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Badge variant="outline" className="cursor-help border-brand-500/25 bg-brand-500/[0.06] text-[9px] font-semibold text-brand-700 dark:text-brand-400">
                                                                                        Sugestão · confiança {confidenceLabels[row.classificationConfidence]}
                                                                                    </Badge>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent className="max-w-72 text-xs">
                                                                                    <p className="font-semibold">{classificationLabels[row.classificationSource]}</p>
                                                                                    <p className="mt-1 text-muted-foreground">{row.classificationExplanation}</p>
                                                                                    <p className="mt-1">Revise a categoria antes de importar.</p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {!isIgnored && !isDuplicate && row.actionType === 'link' && (
                                                                <Select
                                                                    value={row.linkedExpenseId || ""}
                                                                    onValueChange={(val) => handleLinkedExpenseChange(index, val)}
                                                                >
                                                                    <SelectTrigger className={cn(
                                                                      "h-8 w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors shadow-sm",
                                                                      !row.linkedExpenseId ? 'border-rose-500 ring-rose-500' : 'border-slate-200 dark:border-slate-800'
                                                                    )}>
                                                                        <SelectValue placeholder="Selecione..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl backdrop-blur-md shadow-lg">
                                                                        {validLinkableExpenses.map(exp => {
                                                                            const template = financeData.fixedTemplates.find(t => t.id === exp.fixedTemplateId);
                                                                            const alreadyLinked = !!exp.originalTitle;
                                                                            return (
                                                                                <SelectItem key={exp.id} value={exp.id} className="focus:bg-slate-100/50 dark:focus:bg-slate-900/50 rounded-lg text-xs font-medium">
                                                                                    {template?.description || exp.description}
                                                                                    {' '}({format(parseISO(exp.purchaseDate), 'dd/MM')})
                                                                                    {alreadyLinked && (
                                                                                        <span className="ml-1 text-[9px] text-amber-500 font-semibold uppercase">[re-vincular]</span>
                                                                                    )}
                                                                                </SelectItem>
                                                                            )
                                                                        })}
                                                                        {validLinkableExpenses.length === 0 && (
                                                                            <SelectItem value="none" disabled className="text-xs">Nenhuma despesa pendente</SelectItem>
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
                                                                    <SelectTrigger className="h-8 w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors [&>span]:text-left shadow-sm">
                                                                        <SelectValue placeholder="Nenhuma subcategoria..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl backdrop-blur-md shadow-lg">
                                                                        <SelectItem value="none" className="text-slate-400 italic text-left focus:bg-slate-100/50 dark:focus:bg-slate-900/50 rounded-lg text-xs">Nenhuma subcategoria</SelectItem>
                                                                        {selectedCat.subcategories.map(sub => (
                                                                            <SelectItem key={sub.id} value={sub.id} className="focus:bg-slate-100/50 dark:focus:bg-slate-900/50 rounded-lg text-xs font-medium">{sub.name}</SelectItem>
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
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
 
                <DialogFooter className="p-6 border-t border-slate-200/50 dark:border-slate-800/50 bg-slate-100/20 dark:bg-slate-900/20 flex sm:justify-between items-center w-full">
                    <div className="text-xs text-slate-800 dark:text-white font-bold flex-1">
                        <strong>{validToImportCount}</strong> transações prontas{ignoredExpensesToImportCount > 0 && <span> (e <strong>{ignoredExpensesToImportCount}</strong> desconsideradas)</span>} para processar
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="rounded-xl h-[38px] text-xs font-semibold uppercase tracking-wider border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors" onClick={onClose} disabled={isProcessing}>
                            Cancelar
                        </Button>
                        <Button className="rounded-xl h-[38px] text-xs font-semibold uppercase tracking-wider bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-500 dark:hover:bg-brand-600 dark:text-white transition-colors shadow-md shadow-brand-500/10" onClick={handleSave} disabled={isProcessing || (validToImportCount === 0 && ignoredExpensesToImportCount === 0)}>
                            {isProcessing ? "Processando..." : "Salvar Importação"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
