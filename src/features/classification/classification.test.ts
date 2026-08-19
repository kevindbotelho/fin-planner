import { describe, expect, it } from 'vitest';
import type { Category, Expense } from '@/types/finance';
import {
  buildClassificationSuggestions,
  merchantSimilarity,
} from './classification';

const categories: Category[] = [
  {
    id: 'food',
    name: 'Alimentação',
    color: '#f00',
    subcategories: [
      { id: 'restaurants', name: 'Restaurantes', categoryId: 'food' },
      { id: 'market', name: 'Supermercado', categoryId: 'food' },
    ],
  },
  {
    id: 'transport',
    name: 'Transporte',
    color: '#00f',
    subcategories: [
      { id: 'rides', name: 'Uber/99', categoryId: 'transport' },
    ],
  },
  {
    id: 'leisure',
    name: 'Lazer',
    color: '#0f0',
    subcategories: [],
  },
];

const historyExpense = (
  overrides: Partial<Expense> & Pick<Expense, 'id' | 'categoryId'>,
): Expense => ({
  id: overrides.id,
  description: 'Comerciante',
  originalTitle: 'PAG*CAFE CENTRAL SAO PAULO BRA',
  amount: 20,
  purchaseDate: '2026-07-01',
  categoryId: overrides.categoryId,
  subcategoryId: '',
  type: 'variable',
  createdAt: '2026-07-01T12:00:00Z',
  displayOrder: 0,
  bankOrigin: 'Inter',
  ...overrides,
});

describe('merchantSimilarity', () => {
  it('normaliza acentos e calcula similaridade sem tratar nomes distintos como exatos', () => {
    expect(merchantSimilarity('Léo Eventos Vespasiano', 'Leo Eventos')).toBeGreaterThanOrEqual(0.6);
    expect(merchantSimilarity('Mercado Central', 'Uber Rides')).toBe(0);
  });
});

describe('buildClassificationSuggestions', () => {
  it('prioriza histórico exato confirmado e sempre exige revisão', () => {
    const history = ['one', 'two', 'three'].map((id) => historyExpense({
      id,
      categoryId: 'food',
      subcategoryId: 'restaurants',
    }));

    const result = buildClassificationSuggestions({
      transaction: {
        title: 'PAG CAFE CENTRAL',
        bankOrigin: 'Inter',
      },
      history,
      categories,
    });

    expect(result.primary).toMatchObject({
      categoryId: 'food',
      subcategoryId: 'restaurants',
      source: 'exact_history',
      confidence: 'high',
      reviewRequired: true,
    });
    expect(result.primary?.supportingExpenseIds).toEqual(['one', 'two', 'three']);
    expect(result.reviewRequired).toBe(true);
  });

  it('reduz confiança quando o mesmo comerciante possui histórico conflitante', () => {
    const result = buildClassificationSuggestions({
      transaction: { title: 'PAG CAFE CENTRAL', bankOrigin: 'Inter' },
      history: [
        historyExpense({ id: 'food-vote', categoryId: 'food', subcategoryId: 'restaurants' }),
        historyExpense({ id: 'leisure-vote', categoryId: 'leisure' }),
      ],
      categories,
    });

    expect(result.candidates).toHaveLength(2);
    expect(result.candidates.every((candidate) => candidate.confidence !== 'high')).toBe(true);
  });

  it('usa a taxonomia bancária apenas como sugestão revisável', () => {
    const result = buildClassificationSuggestions({
      transaction: {
        title: 'UBER TRIP',
        bankOrigin: 'Inter',
        bankCategory: 'TRANSPORTE',
      },
      history: [],
      categories,
    });

    expect(result.primary).toEqual({
      categoryId: 'transport',
      subcategoryId: 'rides',
      source: 'bank_taxonomy',
      confidence: 'medium',
      score: 0.7,
      supportingExpenseIds: [],
      explanation: 'A categoria informada pelo banco foi mapeada pela taxonomia local.',
      reviewRequired: true,
    });
  });

  it('mantém correspondência fuzzy como baixa confiança', () => {
    const result = buildClassificationSuggestions({
      transaction: { title: 'Leo Eventos' },
      history: [historyExpense({
        id: 'similar',
        categoryId: 'leisure',
        originalTitle: 'Léo Eventos Vespasiano',
      })],
      categories,
    });

    expect(result.primary).toMatchObject({
      categoryId: 'leisure',
      source: 'fuzzy_history',
      confidence: 'low',
      reviewRequired: true,
    });
  });

  it('ignora histórico com categoria removida ou item ignorado', () => {
    const result = buildClassificationSuggestions({
      transaction: { title: 'PAG CAFE CENTRAL' },
      history: [
        historyExpense({ id: 'orphan', categoryId: 'removed-category' }),
        historyExpense({ id: 'ignored', categoryId: 'food', isIgnored: true }),
      ],
      categories,
    });

    expect(result.primary).toBeNull();
    expect(result.candidates).toEqual([]);
  });

  it('mantém o histórico exato acima da taxonomia quando as fontes discordam', () => {
    const result = buildClassificationSuggestions({
      transaction: {
        title: 'PAG CAFE CENTRAL',
        bankCategory: 'TRANSPORTE',
      },
      history: [historyExpense({
        id: 'confirmed',
        categoryId: 'food',
        subcategoryId: 'restaurants',
      })],
      categories,
    });

    expect(result.primary?.source).toBe('exact_history');
    expect(result.primary?.categoryId).toBe('food');
    expect(result.candidates.some((candidate) => candidate.source === 'bank_taxonomy')).toBe(true);
  });
});
