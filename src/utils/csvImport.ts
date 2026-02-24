import { Expense } from "@/types/finance";

export interface ParsedCsvRow {
    date: string;
    title: string;
    amount: number;
    originalLineNumber: number;
}

export interface ReconciledCsvRow extends ParsedCsvRow {
    isDuplicate: boolean;
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

            // Only import negative amounts as expenses (assuming Nubank exports expenses as positive or negative, let's treat based on context)
            // Usually Nubank credit card bill exports expenses as positive numbers in the amount column, and payments as negative.
            // We will parse them all, UI can let the user ignore payments.
            // To be safe and standard with the app logic: We just read the absolute value for expenses if it's a credit card.

            parsedData.push({
                date,
                title,
                amount: Math.abs(amount), // Ensuring amount is positive as stored in DB for expenses
                originalLineNumber: i + 1,
            });
        }
    }

    return parsedData;
};

/**
 * Reconciles parsed CSV rows against existing database expenses to find duplicates.
 * Matching rules: Exact Match on Date AND Amount AND (original_title OR title)
 */
export const reconcileExpenses = (
    parsedRows: ParsedCsvRow[],
    existingExpenses: Expense[]
): ReconciledCsvRow[] => {

    // Create a map/set of existing expenses for O(1) loopups
    // Since we could have multiple identical expenses on the same day, 
    // we count occurrences of the signature.
    const existingSignatures = new Map<string, number>();

    existingExpenses.forEach(exp => {
        // Signature using originalTitle (if it came from a previous CSV)
        if (exp.originalTitle) {
            const sigOriginal = `${exp.purchaseDate}|${exp.amount}|${exp.originalTitle}`;
            existingSignatures.set(sigOriginal, (existingSignatures.get(sigOriginal) || 0) + 1);
        }

        // Always include the signature with the current user-facing title 
        // This catches manual entries that match exactly, or older entries before we had originalTitle
        const sigCurrent = `${exp.purchaseDate}|${exp.amount}|${exp.description}`;
        existingSignatures.set(sigCurrent, (existingSignatures.get(sigCurrent) || 0) + 1);
    });

    return parsedRows.map(row => {
        const signature = `${row.date}|${row.amount}|${row.title}`;
        let isDuplicate = false;

        // Check if this exact signature exists in our DB pool
        const matchCount = existingSignatures.get(signature) || 0;

        // Handle Edge case 1: Multiple identical coffee purchases
        // If we have remaining matches in our pool, we consider it a duplicate and consume one match
        if (matchCount > 0) {
            isDuplicate = true;
            existingSignatures.set(signature, matchCount - 1);
        }

        return {
            ...row,
            isDuplicate,
            ignored: isDuplicate, // By default, ignore duplicates so they aren't imported
            duplicateReason: isDuplicate ? "Identificado como já lançado" : undefined
        };
    });
};
