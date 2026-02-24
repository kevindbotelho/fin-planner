import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { parseNubankCsv, ParsedCsvRow } from "@/utils/csvImport";
import { CsvImportPreview } from "./CsvImportPreview";

export function ImportCsvButton() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedData, setParsedData] = useState<ParsedCsvRow[]>([]);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const handleButtonClick = () => {
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
                const parsed = parseNubankCsv(content);

                if (parsed.length === 0) {
                    toast.warning("Nenhuma transação válida encontrada no arquivo.");
                    return;
                }

                setParsedData(parsed);
                setIsPreviewOpen(true);
            } catch (error) {
                console.error("Error parsing CSV:", error);
                toast.error("Erro ao ler o arquivo CSV. Verifique se ele está no formato correto (padrão Nubank).");
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsText(file, 'utf-8');
    };

    return (
        <>
            <Button
                variant="outline"
                onClick={handleButtonClick}
                className="gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-800 border-purple-200"
            >
                <Upload className="h-4 w-4" />
                Importar Fatura (Nubank)
            </Button>

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
