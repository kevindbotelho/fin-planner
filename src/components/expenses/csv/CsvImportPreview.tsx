import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ParsedCsvRow, reconcileExpenses, ReconciledCsvRow } from "@/utils/csvImport";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, FilePlus2, CheckCircle2, ListX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CsvImportPreviewProps {
    isOpen: boolean;
    onClose: () => void;
    parsedData: ParsedCsvRow[];
}

export function CsvImportPreview({ isOpen, onClose, parsedData }: CsvImportPreviewProps) {
    const { data: financeData, addBulkExpenses } = useFinance();
    const [reconciledData, setReconciledData] = useState<ReconciledCsvRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasReconciled, setHasReconciled] = useState(false);

    // We need to reconcile when the modal opens with new data
    React.useEffect(() => {
        if (isOpen && parsedData.length > 0) {
            const reconciled = reconcileExpenses(parsedData, financeData.expenses);
            setReconciledData(reconciled);
            setHasReconciled(true);
        } else {
            setReconciledData([]);
            setHasReconciled(false);
        }
    }, [isOpen, parsedData, financeData.expenses]);

    const handleCategoryChange = (index: number, value: string) => {
        // value is in format "categoryId|subcategoryId" or just "categoryId"
        const [categoryId, subcategoryId] = value.split("|");

        setReconciledData(prev => {
            const newData = [...prev];
            newData[index] = {
                ...newData[index],
                categoryId: categoryId,
                subcategoryId: subcategoryId || undefined,
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
        const expensesToImport = reconciledData.filter(row => !row.ignored);

        // Validation
        const missingCategories = expensesToImport.filter(row => !row.categoryId);
        if (missingCategories.length > 0) {
            toast.error(`Selecione uma categoria para as ${missingCategories.length} despesas marcadas.`);
            return;
        }

        if (expensesToImport.length === 0) {
            toast.error("Nenhuma despesa selecionada para importação.");
            return;
        }

        setIsProcessing(true);
        try {
            const expensesPayload = expensesToImport.map(row => ({
                description: row.title,
                amount: row.amount,
                purchaseDate: row.date,
                categoryId: row.categoryId!,
                subcategoryId: row.subcategoryId,
                type: 'variable' as const,
                originalTitle: row.title, // Save the original bank name here!
            }));

            await addBulkExpenses(expensesPayload);
            onClose();
        } catch (error) {
            console.error("Error importing expenses:", error);
            // Toast is already handled in the context
        } finally {
            setIsProcessing(false);
        }
    };

    if (!hasReconciled) return null;

    const validToImportCount = reconciledData.filter(r => !r.ignored).length;
    const duplicateCount = reconciledData.filter(r => r.isDuplicate).length;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <FilePlus2 className="h-5 w-5 text-primary" />
                        Revisão de Importação CSV
                    </DialogTitle>
                    <DialogDescription>
                        Encontramos {parsedData.length} transações. Selecione a categoria para as novas despesas e desmarque o que não deseja importar.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {duplicateCount > 0 && (
                        <div className="px-6 py-2 bg-muted/50 border-b flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>Identificamos <strong>{duplicateCount}</strong> transações que já existem no seu sistema. Elas foram ocultadas/desmarcadas por padrão.</span>
                        </div>
                    )}

                    <ScrollArea className="flex-1">
                        <div className="p-6">
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 sticky top-0 z-10">
                                        <tr className="border-b">
                                            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground w-[50px]">Imp.</th>
                                            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground w-[100px]">Data</th>
                                            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground max-w-[200px]">Descrição (Banco)</th>
                                            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground w-[100px]">Valor</th>
                                            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground w-[250px]">Categoria</th>
                                            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground w-[120px]">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reconciledData.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="h-24 text-center text-muted-foreground">
                                                    Nenhuma transação encontrada no arquivo.
                                                </td>
                                            </tr>
                                        ) : (
                                            reconciledData.map((row, index) => {
                                                const isIgnored = row.ignored;
                                                const isDuplicate = row.isDuplicate;

                                                return (
                                                    <tr
                                                        key={`csv-row-${index}`}
                                                        className={`border-b transition-colors hover:bg-muted/50 ${isIgnored ? 'opacity-50 bg-muted/30' : ''}`}
                                                    >
                                                        <td className="p-4 align-middle">
                                                            <Checkbox
                                                                checked={!isIgnored}
                                                                onCheckedChange={() => handleToggleIgnore(index)}
                                                                disabled={isDuplicate && !isIgnored} // Prevent accidentally re-checking a duplicate easily unless we want to allow forced duplicates
                                                            />
                                                        </td>
                                                        <td className="p-4 align-middle">
                                                            {format(new Date(`${row.date}T12:00:00`), "dd/MM/yyyy", { locale: ptBR })}
                                                        </td>
                                                        <td className="p-4 align-middle font-medium truncate max-w-[200px]" title={row.title}>
                                                            {row.title}
                                                        </td>
                                                        <td className="p-4 align-middle font-semibold text-rose-500">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.amount)}
                                                        </td>
                                                        <td className="p-4 align-middle">
                                                            {isDuplicate ? (
                                                                <span className="text-muted-foreground italic text-xs">Pula importação</span>
                                                            ) : (
                                                                <Select
                                                                    value={row.categoryId ? (row.subcategoryId ? `${row.categoryId}|${row.subcategoryId}` : row.categoryId) : undefined}
                                                                    onValueChange={(val) => handleCategoryChange(index, val)}
                                                                    disabled={isIgnored}
                                                                >
                                                                    <SelectTrigger className={`h-8 w-full ${!row.categoryId && !isIgnored ? 'border-destructive ring-destructive' : ''}`}>
                                                                        <SelectValue placeholder="Selecione..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {financeData.categories.map(cat => (
                                                                            <React.Fragment key={cat.id}>
                                                                                <SelectItem value={cat.id} className="font-semibold">{cat.name}</SelectItem>
                                                                                {cat.subcategories.map(sub => (
                                                                                    <SelectItem key={sub.id} value={`${cat.id}|${sub.id}`} className="pl-6 text-sm">
                                                                                        └ {sub.name}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </React.Fragment>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        </td>
                                                        <td className="p-4 align-middle flex items-center gap-2">
                                                            {isDuplicate ? (
                                                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                                                                    Já Existe
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
                                                                    Novo
                                                                </Badge>
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
                        <strong>{validToImportCount}</strong> transações prontas para importar
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={isProcessing || validToImportCount === 0}>
                            {isProcessing ? "Importando..." : "Salvar Importação"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
