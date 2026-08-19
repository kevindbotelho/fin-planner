import type { Category, Expense } from '@/types/finance';
import {
  mapBankCategoryToSystem,
  normalizeTransactionTitle,
} from '@/utils/csvImport';

export type ClassificationConfidence = 'high' | 'medium' | 'low';

export type ClassificationSource =
  | 'exact_history'
  | 'bank_taxonomy'
  | 'fuzzy_history';

export interface ClassificationCandidate {
  categoryId: string;
  subcategoryId?: string;
  source: ClassificationSource;
  confidence: ClassificationConfidence;
  score: number;
  supportingExpenseIds: string[];
  explanation: string;
  reviewRequired: true;
}

export interface ClassificationSuggestionResult {
  primary: ClassificationCandidate | null;
  candidates: ClassificationCandidate[];
  reviewRequired: true;
  merchantKey: string;
}

export interface ClassificationTransaction {
  title: string;
  bankOrigin?: Expense['bankOrigin'];
  bankCategory?: string | null;
}

export interface BuildClassificationSuggestionsInput {
  transaction: ClassificationTransaction;
  history: Expense[];
  categories: Category[];
  maxCandidates?: number;
}

interface HistoricalVote {
  categoryId: string;
  subcategoryId?: string;
  expenseIds: string[];
  count: number;
  similarityTotal: number;
  bankMatches: number;
}

const sourceWeight: Record<ClassificationSource, number> = {
  exact_history: 3,
  bank_taxonomy: 2,
  fuzzy_history: 1,
};

const confidenceWeight: Record<ClassificationConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const roundScore = (value: number) => Math.round(value * 1_000) / 1_000;

const normalizeForTokens = (value: string) =>
  normalizeTransactionTitle(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2);

export const merchantSimilarity = (left: string, right: string) => {
  const leftTokens = new Set(normalizeForTokens(left));
  const rightTokens = new Set(normalizeForTokens(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : roundScore(intersection / union);
};

const targetKey = (categoryId: string, subcategoryId?: string) =>
  `${categoryId}:${subcategoryId ?? ''}`;

const validTargets = (categories: Category[]) => {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  return {
    categoriesById,
    isValid(categoryId: string, subcategoryId?: string) {
      const category = categoriesById.get(categoryId);
      if (!category) return false;
      if (!subcategoryId) return true;
      return category.subcategories.some((subcategory) => subcategory.id === subcategoryId);
    },
  };
};

const historyTitle = (expense: Expense) => expense.originalTitle || expense.description;

const eligibleHistory = (history: Expense[], categories: Category[]) => {
  const targets = validTargets(categories);
  return history.filter(
    (expense) =>
      !expense.isIgnored &&
      Boolean(historyTitle(expense).trim()) &&
      targets.isValid(expense.categoryId, expense.subcategoryId || undefined),
  );
};

const voteFor = (
  votes: Map<string, HistoricalVote>,
  expense: Expense,
  similarity: number,
  bankMatches: boolean,
) => {
  const subcategoryId = expense.subcategoryId || undefined;
  const key = targetKey(expense.categoryId, subcategoryId);
  const vote = votes.get(key) ?? {
    categoryId: expense.categoryId,
    subcategoryId,
    expenseIds: [],
    count: 0,
    similarityTotal: 0,
    bankMatches: 0,
  };

  vote.count += 1;
  vote.similarityTotal += similarity;
  vote.bankMatches += bankMatches ? 1 : 0;
  vote.expenseIds.push(expense.id);
  votes.set(key, vote);
};

const exactHistoryCandidates = (
  transaction: ClassificationTransaction,
  history: Expense[],
): ClassificationCandidate[] => {
  const merchantKey = normalizeTransactionTitle(transaction.title);
  if (!merchantKey) return [];

  const exact = history.filter(
    (expense) => normalizeTransactionTitle(historyTitle(expense)) === merchantKey,
  );
  if (exact.length === 0) return [];

  const votes = new Map<string, HistoricalVote>();
  for (const expense of exact) {
    voteFor(
      votes,
      expense,
      1,
      Boolean(transaction.bankOrigin && expense.bankOrigin === transaction.bankOrigin),
    );
  }

  return [...votes.values()].map((vote) => {
    const dominance = vote.count / exact.length;
    const sameBankRatio = vote.count > 0 ? vote.bankMatches / vote.count : 0;
    const confidence: ClassificationConfidence =
      vote.count >= 3 && dominance === 1
        ? 'high'
        : vote.count >= 1 && dominance >= 0.5
          ? 'medium'
          : 'low';
    const score = roundScore(
      Math.min(0.99, 0.65 + dominance * 0.25 + sameBankRatio * 0.05 + Math.min(vote.count, 5) * 0.01),
    );

    return {
      categoryId: vote.categoryId,
      subcategoryId: vote.subcategoryId,
      source: 'exact_history' as const,
      confidence,
      score,
      supportingExpenseIds: vote.expenseIds,
      explanation:
        `${vote.count} lançamento(s) classificado(s) anteriormente para o mesmo estabelecimento` +
        `${sameBankRatio > 0 ? ' no mesmo banco' : ''}.`,
      reviewRequired: true as const,
    };
  });
};

const taxonomyCandidate = (
  transaction: ClassificationTransaction,
  categories: Category[],
): ClassificationCandidate | null => {
  if (!transaction.bankCategory) return null;

  const mapped = mapBankCategoryToSystem(
    transaction.bankCategory,
    transaction.title,
    categories,
  );
  if (!mapped) return null;

  return {
    categoryId: mapped.categoryId,
    subcategoryId: mapped.subcategoryId,
    source: 'bank_taxonomy',
    confidence: mapped.subcategoryId ? 'medium' : 'low',
    score: mapped.subcategoryId ? 0.7 : 0.6,
    supportingExpenseIds: [],
    explanation: `A categoria informada pelo banco foi mapeada pela taxonomia local.`,
    reviewRequired: true,
  };
};

const fuzzyHistoryCandidates = (
  transaction: ClassificationTransaction,
  history: Expense[],
): ClassificationCandidate[] => {
  const merchantKey = normalizeTransactionTitle(transaction.title);
  if (!merchantKey) return [];

  const votes = new Map<string, HistoricalVote>();

  for (const expense of history) {
    const storedTitle = historyTitle(expense);
    const storedKey = normalizeTransactionTitle(storedTitle);
    if (!storedKey || storedKey === merchantKey) continue;

    const similarity = merchantSimilarity(transaction.title, storedTitle);
    if (similarity < 0.6) continue;

    voteFor(
      votes,
      expense,
      similarity,
      Boolean(transaction.bankOrigin && expense.bankOrigin === transaction.bankOrigin),
    );
  }

  return [...votes.values()].map((vote) => {
    const averageSimilarity = vote.similarityTotal / vote.count;
    const sameBankRatio = vote.count > 0 ? vote.bankMatches / vote.count : 0;
    const score = roundScore(
      Math.min(0.69, averageSimilarity * 0.6 + sameBankRatio * 0.05 + Math.min(vote.count, 3) * 0.01),
    );

    return {
      categoryId: vote.categoryId,
      subcategoryId: vote.subcategoryId,
      source: 'fuzzy_history' as const,
      confidence: 'low' as const,
      score,
      supportingExpenseIds: vote.expenseIds,
      explanation:
        `${vote.count} lançamento(s) anterior(es) possuem um estabelecimento com nome semelhante.`,
      reviewRequired: true as const,
    };
  });
};

const sortCandidates = (left: ClassificationCandidate, right: ClassificationCandidate) => {
  const sourceDifference = sourceWeight[right.source] - sourceWeight[left.source];
  if (sourceDifference !== 0) return sourceDifference;

  const confidenceDifference = confidenceWeight[right.confidence] - confidenceWeight[left.confidence];
  if (confidenceDifference !== 0) return confidenceDifference;

  if (right.score !== left.score) return right.score - left.score;
  return targetKey(left.categoryId, left.subcategoryId).localeCompare(
    targetKey(right.categoryId, right.subcategoryId),
  );
};

const keepBestCandidatePerTarget = (candidates: ClassificationCandidate[]) => {
  const byTarget = new Map<string, ClassificationCandidate>();

  for (const candidate of [...candidates].sort(sortCandidates)) {
    const key = targetKey(candidate.categoryId, candidate.subcategoryId);
    if (!byTarget.has(key)) byTarget.set(key, candidate);
  }

  return [...byTarget.values()].sort(sortCandidates);
};

export function buildClassificationSuggestions(
  input: BuildClassificationSuggestionsInput,
): ClassificationSuggestionResult {
  const merchantKey = normalizeTransactionTitle(input.transaction.title);
  const history = eligibleHistory(input.history, input.categories);

  const candidates = [
    ...exactHistoryCandidates(input.transaction, history),
    taxonomyCandidate(input.transaction, input.categories),
    ...fuzzyHistoryCandidates(input.transaction, history),
  ].filter((candidate): candidate is ClassificationCandidate => candidate !== null);

  const ranked = keepBestCandidatePerTarget(candidates)
    .slice(0, Math.max(0, input.maxCandidates ?? 3));

  return {
    primary: ranked[0] ?? null,
    candidates: ranked,
    reviewRequired: true,
    merchantKey,
  };
}
