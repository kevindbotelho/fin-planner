import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { parseNubankCsv, parseInterCsv, ParsedCsvRow } from "@/utils/csvImport";
import { CsvImportPreview } from "./CsvImportPreview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ImportCsvButton() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedData, setParsedData] = useState<ParsedCsvRow[]>([]);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
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

                setParsedData(parsed);
                setIsPreviewOpen(true);
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
                        className="gap-2 bg-primary/5 hover:bg-primary/10 text-primary hover:text-primary border-primary/20"
                    >
                        <Upload className="h-4 w-4" />
                        Importar CSV
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                        onClick={() => handleButtonClick('Nubank')}
                        className="gap-2 cursor-pointer text-purple-700 hover:text-purple-800 hover:bg-purple-50 focus:bg-purple-50 focus:text-purple-800"
                    >
                        <div className="h-5 w-5 bg-white rounded-sm flex items-center justify-center overflow-hidden p-[2px]">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/f/f7/Nubank_logo_2021.svg" alt="Nubank" className="h-full w-full object-contain" />
                        </div>
                        Fatura Nubank
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onClick={() => handleButtonClick('Inter')}
                        className="gap-2 cursor-pointer text-orange-600 hover:text-orange-700 hover:bg-orange-50 focus:bg-orange-50 focus:text-orange-700"
                    >
                        <div className="h-5 w-5 bg-white rounded-sm flex items-center justify-center overflow-hidden p-[2px]">
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

            {isPreviewOpen && (
                <CsvImportPreview
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                    parsedData={parsedData}
                />
            )}
        </>
    );
}
