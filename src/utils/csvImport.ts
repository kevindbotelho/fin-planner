import { Expense, FixedExpenseTemplate, Category } from "@/types/finance";
import { differenceInDays, parseISO } from "date-fns";

export interface ParsedCsvRow {
    date: string;
    title: string;
    amount: number;
    originalLineNumber: number;
    bankOrigin?: 'Nubank' | 'Inter' | null;
    bankCategory?: string | null;
}

export interface ReconciledCsvRow extends ParsedCsvRow {
    isDuplicate: boolean;
    isNegative: boolean;
    ignored: boolean;
    categoryId?: string;
    subcategoryId?: string;
    duplicateReason?: string;
}

export interface ExtendedReconciledCsvRow extends ReconciledCsvRow {
    actionType: 'new' | 'link';
    expenseType: 'variable' | 'fixed';
    linkedExpenseId?: string;
    linkedTemplateId?: string;
    isMatchedPair?: boolean;
    classificationConfidence?: 'high' | 'medium' | 'low';
    classificationSource?: 'exact_history' | 'bank_taxonomy' | 'fuzzy_history';
    classificationExplanation?: string;
    classificationReviewRequired?: boolean;
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

        // Expressão regular para lidar corretamente com campos que possuem aspas e vírgulas internas
        // Ex: 2026-06-09,Amazon,"288,54"
        const matches = line.match(/(\x22[^\x22]*\x22|[^\x22,\s]+)(?=\s*,|\s*$)/g) || [];
        const parts = matches.map(val => val.replace(/^\x22|\x22$/g, '').trim());

        // We expect at least 3 parts: date, title, amount
        if (parts.length >= 3) {
            const date = parts[0].trim();
            // Titles might contain commas, but since we parsed using regex, we can take the fields directly
            let title = parts.slice(1, parts.length - 1).join(',').trim();
            let amountStr = parts[parts.length - 1].trim();

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

            // Trata o formato de número brasileiro (vírgula decimal)
            // Converte "288,54" para "288.54"
            let cleanAmountStr = amountStr.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
            const amount = parseFloat(cleanAmountStr);
            if (isNaN(amount)) {
                console.warn(`Line ${i + 1}: Invalid amount format "${amountStr}".`);
                continue;
            }

            parsedData.push({
                date,
                title,
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
    
    let startIdx = 0;
    if (lines[0] && (lines[0].toLowerCase().includes('data') || lines[0].toLowerCase().includes('lançamento') || lines[0].toLowerCase().includes('lancamento'))) {
        startIdx = 1;
    }

    interface TempRow {
        date: string;
        rawTitle: string;
        cleanTitle: string;
        bankCategory: string | null;
        type: string;
        amount: number;
        originalLineNumber: number;
    }

    const tempRows: TempRow[] = [];

    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const separator = line.includes(';') ? ';' : ',';
        const regex = new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
        const parts = line.split(regex).map(p => p.replace(/"/g, '').trim());
        
        if (parts.length >= 3) {
            let dateStr = parts[0];
            let title = parts[1];
            let bankCategory = parts.length >= 5 ? parts[2] : null;
            let type = parts.length >= 5 ? parts[3] : '';
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

            tempRows.push({
                date,
                rawTitle: title,
                cleanTitle: beautifyTransactionTitle(title),
                bankCategory,
                type,
                amount,
                originalLineNumber: i + 1
            });
        }
    }

    // Processar e agrupar parcelas
    const installmentRegex = /parcela\s+(\d+)\/(\d+)/i;

    interface GroupedInstallment {
        key: string;
        date: string;
        cleanTitle: string;
        bankCategory: string | null;
        totalInstallments: number;
        unitAmount: number;
        rows: TempRow[];
    }

    const installmentGroups = new Map<string, GroupedInstallment>();
    const nonInstallmentRows: ParsedCsvRow[] = [];

    tempRows.forEach(row => {
        const match = row.type.match(installmentRegex);
        if (match) {
            const totalInstallments = parseInt(match[2], 10);
            const unitAmount = row.amount;
            
            // Chave de agrupamento: data + título limpo + total de parcelas + valor unitário da parcela
            const key = `${row.date}_${row.cleanTitle.toLowerCase()}_${totalInstallments}_${unitAmount}`;
            
            if (!installmentGroups.has(key)) {
                installmentGroups.set(key, {
                    key,
                    date: row.date,
                    cleanTitle: row.cleanTitle,
                    bankCategory: row.bankCategory,
                    totalInstallments,
                    unitAmount,
                    rows: []
                });
            }
            installmentGroups.get(key)!.rows.push(row);
        } else {
            // Não é parcela, é compra à vista ou pagamentos
            nonInstallmentRows.push({
                date: row.date,
                title: row.rawTitle,
                amount: row.amount,
                originalLineNumber: row.originalLineNumber,
                bankOrigin: 'Inter',
                bankCategory: row.bankCategory
            });
        }
    });

    // Formatar e agrupar as parcelas
    const processedInstallmentRows: ParsedCsvRow[] = [];

    installmentGroups.forEach(group => {
        const rows = group.rows;
        // Extrai os números das parcelas presentes
        const installmentNumbers = rows
            .map(r => {
                const m = r.type.match(installmentRegex);
                return m ? parseInt(m[1], 10) : 0;
            })
            .filter(n => n > 0);
        
        // Remove duplicados e ordena
        const uniqueNumbers = Array.from(new Set(installmentNumbers)).sort((a, b) => a - b);
        
        // Soma os valores das parcelas agrupadas (com arredondamento de duas casas decimais)
        const totalAmount = parseFloat(rows.reduce((sum, r) => sum + r.amount, 0).toFixed(2));
        
        // Menor número de linha do arquivo original para preservação de ordem
        const minLineNumber = Math.min(...rows.map(r => r.originalLineNumber));

        // Formatação do sufixo de parcelas
        let suffix = '';
        if (uniqueNumbers.length === 1) {
            suffix = `(Parcela ${uniqueNumbers[0]}/${group.totalInstallments})`;
        } else {
            // Verifica se são consecutivas
            let isConsecutive = true;
            for (let i = 1; i < uniqueNumbers.length; i++) {
                if (uniqueNumbers[i] !== uniqueNumbers[i - 1] + 1) {
                    isConsecutive = false;
                    break;
                }
            }
            if (isConsecutive) {
                suffix = `(Parcela ${uniqueNumbers[0]} a ${uniqueNumbers[uniqueNumbers.length - 1]}/${group.totalInstallments})`;
            } else {
                suffix = `(Parcelas ${uniqueNumbers.join(',')}/${group.totalInstallments})`;
            }
        }

        // Título final combinando o título limpo + o sufixo formatado das parcelas
        const finalTitle = `${group.cleanTitle} ${suffix}`;

        processedInstallmentRows.push({
            date: group.date,
            title: finalTitle,
            amount: totalAmount,
            originalLineNumber: minLineNumber,
            bankOrigin: 'Inter',
            bankCategory: group.bankCategory
        });
    });

    // Combina despesas normais e parceladas
    const allRows = [...nonInstallmentRows, ...processedInstallmentRows];

    // Ordena pelo originalLineNumber para manter a ordem do arquivo
    allRows.sort((a, b) => a.originalLineNumber - b.originalLineNumber);

    return allRows;
};


/**
 * Cleans and beautifies a transaction title for display and storage.
 * - Handles specific known brands (99 App, Uber)
 * - Removes generic bank prefixes like "IFD*", "PAG*", "DL *" (any 2–5 uppercase letters + asterisk)
 * - Removes geographic city suffixes appended by banks, including truncated versions
 *   e.g. "BELO HORIZONT" (without the final E), "SAO PAULO", "BRA"
 * - Collapses extra whitespace
 */
export const beautifyTransactionTitle = (title: string): string => {
    let clean = title.trim();

    // 1. Specific brand mapping (case-insensitive)
    const upper = clean.toUpperCase().replace(/\*/g, ' ').replace(/\s+/g, ' ');
    if (/\b99\s*APP\b/.test(upper)) return '99 App';
    if (/\bUBER\s*RIDES?\b/.test(upper)) return 'UberRides';
    if (/\bUBER\s*EATS?\b/.test(upper)) return 'Uber Eats';

    // 2. Remove generic bank prefixes: any 2–5 uppercase letters (optionally digits) followed by asterisk
    // e.g. "IFD*39989529", "PAG*MERCADO", "DL *UberRides", "IOF-"
    clean = clean.replace(/^[A-Z]{2,5}\s*[\*-]/i, '');
    // Replace remaining asterisks with a space
    clean = clean.replace(/\*/g, ' ');

    // 3. Remove geographic suffixes appended by banks.
    //    Banks often truncate city names (e.g. "BELO HORIZONT" instead of "BELO HORIZONTE")
    //    and may or may not include a country code after the city.
    //    Strategy: remove a trailing city name (exact or truncated) + optional country code,
    //    OR just a trailing country code alone.
    const cityPattern = [
        's[aã]o paulo?',          // São Paulo / Sao Paulo
        'rio de janeiro',
        'belo horizont[e]?',      // handles "BELO HORIZONT" (truncated) and "BELO HORIZONTE"
        'curitiba',
        'fortaleza',
        'manaus',
        'salvador',
        'recife',
        'porto alegre',
        'florian[oó]polis',
        'goi[aâ]nia',
        'natal',
        'macei[oó]',
        'campinas',
        'bel[eé]m',
    ].join('|');
    const countryPattern = 'br(?:a(?:sil|zil)?)?|s\\.?p\\.?';

    // Remove: trailing city (optionally followed by country code)
    clean = clean.replace(
        new RegExp(`\\s+(?:${cityPattern})(?:\\s+(?:${countryPattern}))?\\s*$`, 'i'),
        ''
    );
    // Remove: trailing country code only (if no city matched above)
    clean = clean.replace(
        new RegExp(`\\s+(?:${countryPattern})\\s*$`, 'i'),
        ''
    );

    // 4. Final polish: collapse spaces and trim
    return clean.replace(/\s+/g, ' ').trim();
};

/**
 * Normalizes a transaction title PURELY FOR COMPARISON purposes.
 * Does NOT remove bank prefixes (e.g. "IFD", "PAG") — these are kept so that
 * "IFD*39989529..." (old format with asterisk) and "IFD 39989529..." (new format)
 * both normalize to "ifd 39989529..." and correctly match each other.
 *
 * Rules applied:
 *  1. Replace asterisks with a space (asterisk = separator, not content)
 *  2. Remove trailing geographic city/country suffixes added by banks
 *  3. Lowercase + collapse whitespace
 */
export const normalizeTransactionTitle = (title: string): string => {
    let normalized = title.trim();

    // 1. Replace asterisks with space (NOT removing the prefix before it)
    normalized = normalized.replace(/\*/g, ' ');

    // 2. Remove trailing geographic suffixes (same list as beautify)
    const cityPattern = [
        's[aã]o paulo?',
        'rio de janeiro',
        'belo horizont[e]?',
        'curitiba',
        'fortaleza',
        'manaus',
        'salvador',
        'recife',
        'porto alegre',
        'florian[oó]polis',
        'goi[aâ]nia',
        'natal',
        'macei[oó]',
        'campinas',
        'bel[eé]m',
    ].join('|');
    const countryPattern = 'br(?:a(?:sil|zil)?)?|s\.?p\.?';

    normalized = normalized.replace(
        new RegExp(`\\s+(?:${cityPattern})(?:\\s+(?:${countryPattern}))?\\s*$`, 'i'),
        ''
    );
    normalized = normalized.replace(
        new RegExp(`\\s+(?:${countryPattern})\\s*$`, 'i'),
        ''
    );

    // 3. Lowercase + collapse whitespace
    return normalized.replace(/\s+/g, ' ').trim().toLowerCase();
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

        // 5. FUZZY NAME MATCH (Token Overlap): same amount, date within 5 days, high token overlap.
        //    Catches cases where the bank completely changes the name but it's the same charge
        //    e.g., "Léo Eventos Vespasiano" -> "Léo Eventos"
        if (matchIndex === -1 && !row.isMatchedPair) {
            matchIndex = availableExpenses.findIndex(exp => {
                const isExactAmount = exp.amount === Math.abs(row.amount);
                if (!isExactAmount) return false;
                
                const daysDiff = Math.abs(differenceInDays(parseISO(row.date), parseISO(exp.purchaseDate)));
                if (daysDiff > 5) return false;
                
                const storedTitle = exp.originalTitle || exp.description;
                if (!storedTitle) return false;
                
                // Token overlap calculation
                const tokenize = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
                const tokens1 = new Set(tokenize(row.title));
                const tokens2 = new Set(tokenize(storedTitle));
                
                if (tokens1.size === 0 || tokens2.size === 0) return false;
                
                let intersection = 0;
                for (const t of tokens1) {
                    if (tokens2.has(t)) intersection++;
                }
                
                // Use minimum length of tokens to allow subset matches (e.g. "Léo Eventos" in "Léo Eventos Vespasiano")
                const minTokens = Math.min(tokens1.size, tokens2.size);
                const score = intersection / minTokens;
                
                // If 50% or more of the smaller name's tokens are present in the larger one, it's a match
                return score >= 0.5;
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

/**
 * Maps a bank category string from Banco Inter to a category and subcategory in the system.
 */
export const mapBankCategoryToSystem = (
    bankCategory: string,
    title: string,
    systemCategories: Category[]
): { categoryId: string; subcategoryId?: string } | null => {
    const normBank = bankCategory.toUpperCase().trim();
    const normTitle = title.toUpperCase();

    let targetCategoryName = '';
    let targetSubcategoryName = '';

    if (normBank === 'TRANSPORTE') {
        targetCategoryName = 'Transporte';
        if (normTitle.includes('UBER') || normTitle.includes('99APP') || normTitle.includes('99FOOD')) {
            targetSubcategoryName = 'Uber/99';
        }
    } else if (normBank === 'RESTAURANTES') {
        targetCategoryName = 'Alimentação';
        targetSubcategoryName = 'Restaurantes';
    } else if (normBank === 'SUPERMERCADO') {
        targetCategoryName = 'Alimentação';
        targetSubcategoryName = 'Supermercado';
    } else if (normBank === 'DROGARIA') {
        targetCategoryName = 'Saúde';
        targetSubcategoryName = 'Farmácia';
    } else if (normBank === 'VESTUARIO') {
        targetCategoryName = 'Vestuário';
        targetSubcategoryName = 'Roupas';
    } else if (normBank === 'ENSINO') {
        targetCategoryName = 'Educação';
    } else if (normBank === 'LAZER') {
        targetCategoryName = 'Lazer';
    } else if (normBank === 'BARES') {
        targetCategoryName = 'Alimentação';
        targetSubcategoryName = 'Restaurantes';
    } else if (normBank === 'OUTROS' || normBank === 'COMPRAS' || normBank === 'SERVICOS') {
        targetCategoryName = 'Outros';
    }

    if (!targetCategoryName) return null;

    const cat = systemCategories.find(c => c.name.toLowerCase() === targetCategoryName.toLowerCase());
    if (!cat) return null;

    let subcategoryId: string | undefined = undefined;
    if (targetSubcategoryName && cat.subcategories) {
        const sub = cat.subcategories.find((s: any) => s.name.toLowerCase() === targetSubcategoryName.toLowerCase());
        if (sub) {
            subcategoryId = sub.id;
        }
    }

    return {
        categoryId: cat.id,
        subcategoryId
    };
};
