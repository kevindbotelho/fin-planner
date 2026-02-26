import { Expense } from "@/types/finance";
import { differenceInDays, parseISO } from "date-fns";

export interface ParsedCsvRow {
    date: string;
    title: string;
    amount: number;
    originalLineNumber: number;
}

export interface ReconciledCsvRow extends ParsedCsvRow {
    isDuplicate: boolean;
    isNegative: boolean;
    ignored: boolean;
    categoryId?: string;
    subcategoryId?: string;
    duplicateReason?: string;
}

/**
 * Parses a standard Nubank CSV file into an array of objects.
 * Nubank CSV format: date (YYYY-MM-DD), title, amount
 * Example: 2026-02-10,PAG*SUPER MERCADO,150.50
 */
export const parseNubankCsv = (csvContent: string): ParsedCsvRow[] => {
    const lines = csvContent.split('\n');
    const parsedData: ParsedCsvRow[] = [];

    // Start from index 1 to skip header (Data,Título,Valor)
    // Or handle cases where there might not be a header
    let startIdx = 0;
    if (lines[0] && lines[0].toLowerCase().includes('data')) {
        startIdx = 1;
    }

    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');

        // Some lines might use semicolon or have different structures if not standard Nubank
        // We expect at least 3 parts: date, title, amount
        if (parts.length >= 3) {
            const date = parts[0].trim();
            // Titles might contain commas, so we join everything between the first and last element
            // For Nubank, it usually doesn't, but just in case
            let title = parts.slice(1, parts.length - 1).join(',').trim();
            const amountStr = parts[parts.length - 1].trim();

            // Basic validation for YYYY-MM-DD
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(date)) {
                console.warn(`Line ${i + 1}: Invalid date format "${date}". Expected YYYY-MM-DD.`);
                continue;
            }

            // If title is empty or amount is not a number
            if (!title) {
                title = 'Importação S/ Titulo';
            }

            const amount = parseFloat(amountStr);
            if (isNaN(amount)) {
                console.warn(`Line ${i + 1}: Invalid amount format "${amountStr}".`);
                continue;
            }

            parsedData.push({
                date,
                title,
                amount: amount, // Keeping the exact sign from CSV (negatives for incomes/refunds)
                originalLineNumber: i + 1,
            });
        }
    }

    return parsedData;
};

/**
 * Reconciles parsed CSV rows against existing database expenses to find duplicates.
 * Matching rules: 
 * 1. Exact Match on Date AND Amount AND (original_title OR title)
 * 2. Fuzzy Match on Amount AND original_title AND (Date within +/- 5 days) -> Handles floating recurring fixed expenses
 */
export const reconcileExpenses = (
    parsedRows: ParsedCsvRow[],
    existingExpenses: Expense[]
): ReconciledCsvRow[] => {

    // Clone array to consume matches and handle identical transactions independently
    const availableExpenses = [...existingExpenses];

    // First pass: identify matching positive and negative transactions on the same day
    const rowsWithPairStatus = parsedRows.map(row => ({ ...row, isMatchedPair: false }));

    for (let i = 0; i < rowsWithPairStatus.length; i++) {
        const current = rowsWithPairStatus[i];
        if (current.isMatchedPair) continue;

        // Try to find the exact opposite amount on the same day
        const matchIndex = rowsWithPairStatus.findIndex((other, index) =>
            index !== i &&
            !other.isMatchedPair &&
            other.date === current.date &&
            Math.abs(other.amount) === Math.abs(current.amount) &&
            other.amount === -current.amount
        );

        if (matchIndex !== -1) {
            rowsWithPairStatus[i].isMatchedPair = true;
            rowsWithPairStatus[matchIndex].isMatchedPair = true;
        }
    }

    return rowsWithPairStatus.map(row => {
        let isDuplicate = false;
        let matchIndex = -1;

        // 1. Try to find EXACT match first
        matchIndex = availableExpenses.findIndex(exp => {
            const isExactDate = exp.purchaseDate === row.date;
            const isExactAmount = exp.amount === Math.abs(row.amount);
            const isExactOriginalTitle = exp.originalTitle === row.title;
            const isExactTitle = exp.description === row.title;

            return isExactDate && isExactAmount && (isExactOriginalTitle || (!exp.originalTitle && isExactTitle));
        });

        // 2. If no exact match, try FUZZY match (crucial for fixed expenses that float by days)
        if (matchIndex === -1 && !row.isMatchedPair) {
            matchIndex = availableExpenses.findIndex(exp => {
                const isExactAmount = exp.amount === Math.abs(row.amount);
                const isExactOriginalTitle = exp.originalTitle === row.title;

                // Only fuzzy match if the originalTitle is strictly set (meaning it was verified before via csv import / vinculation)
                if (isExactAmount && isExactOriginalTitle) {
                    const daysDiff = Math.abs(differenceInDays(parseISO(row.date), parseISO(exp.purchaseDate)));
                    return daysDiff <= 5;
                }
                return false;
            });
        }

        // 3. Mark and consume (only if not a matched pair that is skipping the import)
        if (matchIndex !== -1 && !row.isMatchedPair) {
            isDuplicate = true;
            // Consume this existing expense so it can't be matched again
            availableExpenses.splice(matchIndex, 1);
        }

        const isNegative = row.amount < 0;

        let reason = undefined;
        if (row.isMatchedPair) reason = "Compra e estorno identificados";
        else if (isDuplicate) reason = "Identificado como já lançado";
        else if (isNegative) reason = "Valor de entrada/estorno (Negativo)";

        return {
            ...row,
            isDuplicate,
            isNegative,
            ignored: isDuplicate || isNegative || row.isMatchedPair, // Ignore matched pairs automatically
            duplicateReason: reason
        };
    });
};
