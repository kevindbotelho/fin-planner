import { Expense, FixedExpenseTemplate } from "@/types/finance";
import { differenceInDays, parseISO } from "date-fns";

export interface ParsedCsvRow {
    date: string;
    title: string;
    amount: number;
    originalLineNumber: number;
    bankOrigin?: 'Nubank' | 'Inter' | null;
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
                title: beautifyTransactionTitle(title),
                amount: amount, // Keeping the exact sign from CSV (negatives for incomes/refunds)
                originalLineNumber: i + 1,
                bankOrigin: 'Nubank',
            });
        }
    }

    return parsedData;
};

/**
 * Parses a generic Banco Inter CSV file into an array of objects.
 * Expects formats like: "Data Lançamento";"Histórico";"Valor"
 */
export const parseInterCsv = (csvContent: string): ParsedCsvRow[] => {
    const lines = csvContent.split('\n');
    const parsedData: ParsedCsvRow[] = [];
    
    let startIdx = 0;
    if (lines[0] && (lines[0].toLowerCase().includes('data') || lines[0].toLowerCase().includes('lançamento') || lines[0].toLowerCase().includes('lancamento'))) {
        startIdx = 1;
    }

    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const separator = line.includes(';') ? ';' : ',';
        const regex = new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
        const parts = line.split(regex).map(p => p.replace(/"/g, '').trim());
        
        if (parts.length >= 3) {
            let dateStr = parts[0];
            let title = parts[1];
            let amountStr = parts[parts.length - 1];

            // Parse DD/MM/YYYY
            let date = dateStr;
            const brDateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
            const brMatch = dateStr.match(brDateRegex);
            if (brMatch) {
                date = `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
            }

            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(date)) continue;
            if (!title) title = 'Importação S/ Titulo';

            let cleanAmountStr = amountStr.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
            let amount = parseFloat(cleanAmountStr);
            if (isNaN(amount)) continue;

            parsedData.push({
                date,
                title: beautifyTransactionTitle(title),
                amount,
                originalLineNumber: i + 1,
                bankOrigin: 'Inter',
            });
        }
    }
    
    return parsedData;
};


/**
 * Cleans and beautifies a transaction title for display and storage.
 * - Handles specific cases like 99 and Uber
 * - Removes bank noise like "PAG*", "DL *", "IOF-"
 * - Removes geographic suffixes
 * - Fixes casing and spacing
 */
export const beautifyTransactionTitle = (title: string): string => {
    let clean = title.trim();

    // 1. Specific brand mapping (Case insensitive match)
    const upper = clean.toUpperCase();
    if (upper.includes('99APP') || (upper.includes('99') && upper.includes('APP'))) return '99 App';
    if (upper.includes('UBERRIDES') || upper.includes('UBER RIDES')) return 'UberRides';
    if (upper.includes('UBER') && upper.includes('EATS')) return 'Uber Eats';

    // 2. Remove common bank prefixes/separators
    clean = clean.replace(/^(PAG\*|DL\s*\*|IOF-|AVELAR\*|MARKETPLACE\*)/i, '');
    clean = clean.replace(/\*/g, ' ');

    // 3. Remove geographic suffixes (same logic as normalization)
    clean = clean.replace(
        /\s+(?:(?:s[aã]o paulo|rio de janeiro|belo horizonte|curitiba|fortaleza|manaus|salvador|recife|porto alegre)\s+)?(?:br(?:a(?:sil|zil)?)?|s\.?p\.?)\s*$/i,
        ''
    );

    // 4. Final Polish: collapse spaces and trim
    return clean.replace(/\s+/g, ' ').trim();
};

/**
 * Normalizes a transaction title for fuzzy comparison.
 * Uses the beautified version as base to ensure consistency.
 */
export const normalizeTransactionTitle = (title: string): string => {
    return beautifyTransactionTitle(title).toLowerCase();
};


/**
 * Reconciles parsed CSV rows against existing database expenses to find duplicates.
 * Matching rules:
 * 1. Exact Match on Date AND Amount AND (original_title OR title)
 * 2. Fuzzy Match on Amount AND original_title AND (Date within +/- 5 days) → Handles floating recurring fixed expenses
 * 3. Template Match: expense projected from a template that already learned this CSV title
 * 4. Normalized Name Match: same Date AND Amount, names match after removing geo suffixes & asterisks
 */
export const reconcileExpenses = (
    parsedRows: ParsedCsvRow[],
    existingExpenses: Expense[],
    fixedTemplates: FixedExpenseTemplate[] = []
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

        // 3. If still no match, try TEMPLATE match: the expense was projected from a template
        //    that already learned this CSV title via a previous vinculation.
        if (matchIndex === -1 && !row.isMatchedPair) {
            matchIndex = availableExpenses.findIndex(exp => {
                if (!exp.fixedTemplateId || exp.originalTitle) return false; // Only match unverified projected expenses
                const isExactAmount = exp.amount === Math.abs(row.amount);
                if (!isExactAmount) return false;

                // Check if the parent template's originalTitle matches the CSV title
                const template = fixedTemplates.find(t => t.id === exp.fixedTemplateId);
                if (!template?.originalTitle) return false;

                if (template.originalTitle === row.title) {
                    const daysDiff = Math.abs(differenceInDays(parseISO(row.date), parseISO(exp.purchaseDate)));
                    return daysDiff <= 5;
                }
                return false;
            });
        }

        // 4. NORMALIZED NAME MATCH: same date + same amount + names match after normalization.
        //    Catches cases where the bank changes the transaction name between exports,
        //    e.g. "99APP *99App" → "99APP 99App São Paulo BRA"
        //         "DL *UberRides" → "DL UberRides Sao Paulo BRA"
        if (matchIndex === -1 && !row.isMatchedPair) {
            const normalizedRowTitle = normalizeTransactionTitle(row.title);
            matchIndex = availableExpenses.findIndex(exp => {
                const isExactDate   = exp.purchaseDate === row.date;
                const isExactAmount = exp.amount === Math.abs(row.amount);
                if (!isExactDate || !isExactAmount) return false;

                // Compare against originalTitle first (the real CSV name), fall back to description
                const storedTitle = exp.originalTitle || exp.description;
                if (!storedTitle) return false;

                return normalizeTransactionTitle(storedTitle) === normalizedRowTitle;
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
