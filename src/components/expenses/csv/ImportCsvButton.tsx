import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { parseNubankCsv, parseInterCsv, ParsedCsvRow } from "@/utils/csvImport";
import { CsvImportPreview } from "./CsvImportPreview";
import { useFinance } from "@/contexts/FinanceContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
 
export function ImportCsvButton() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { csvParsedData, startCsvImport, cancelCsvImport } = useFinance();
    const [activeBank, setActiveBank] = useState<'Nubank' | 'Inter'>('Nubank');
 
    const handleButtonClick = (bank: 'Nubank' | 'Inter') => {
        setActiveBank(bank);
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.csv')) {
            toast.error("Por favor, selecione um arquivo válido no formato CSV.");
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                let parsed: ParsedCsvRow[] = [];
                
                if (activeBank === 'Nubank') {
                    parsed = parseNubankCsv(content);
                } else if (activeBank === 'Inter') {
                    parsed = parseInterCsv(content);
                }

                if (parsed.length === 0) {
                    toast.warning("Nenhuma transação válida encontrada no arquivo.");
                    return;
                }

                startCsvImport(parsed);
            } catch (error) {
                console.error("Error parsing CSV:", error);
                toast.error(`Erro ao ler o arquivo CSV. Verifique se ele está no formato correto (padrão ${activeBank}).`);
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsText(file, 'utf-8');
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className="gap-2 rounded-xl h-9 text-xs font-semibold uppercase tracking-wider liquid-glass border-slate-200 dark:border-slate-800 text-brand-600 dark:text-brand-400 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 hover:text-brand-600 transition-all duration-200"
                    >
                        <Upload className="h-4 w-4" />
                        Importar CSV
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl backdrop-blur-md shadow-lg w-48 p-1.5">
                    <DropdownMenuItem 
                        onClick={() => handleButtonClick('Nubank')}
                        className="gap-2.5 cursor-pointer text-xs font-semibold text-purple-600 dark:text-purple-400 focus:bg-purple-500/10 focus:text-purple-600 dark:focus:bg-purple-500/15 rounded-lg p-2.5 transition-colors"
                    >
                        <div className="h-5 w-5 bg-white border border-slate-150 rounded-md flex items-center justify-center overflow-hidden p-[2px]">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/f/f7/Nubank_logo_2021.svg" alt="Nubank" className="h-full w-full object-contain" />
                        </div>
                        Fatura Nubank
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onClick={() => handleButtonClick('Inter')}
                        className="gap-2.5 cursor-pointer text-xs font-semibold text-orange-600 dark:text-orange-400 focus:bg-orange-500/10 focus:text-orange-600 dark:focus:bg-orange-500/15 rounded-lg p-2.5 transition-colors"
                    >
                        <div className="h-5 w-5 bg-white border border-slate-150 rounded-md flex items-center justify-center overflow-hidden p-[2px]">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/8/8f/Logo_do_banco_Inter_%282023%29.svg" alt="Inter" className="h-full w-full object-contain" />
                        </div>
                        Fatura Inter
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
            />

            {csvParsedData.length > 0 && (
                <CsvImportPreview
                    isOpen={csvParsedData.length > 0}
                    onClose={cancelCsvImport}
                />
            )}
        </>
    );
}
