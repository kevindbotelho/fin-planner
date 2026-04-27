import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { addDays, addMonths, format, lastDayOfMonth, parseISO } from 'date-fns';
import { Category, Subcategory, Expense, BillingPeriod, MonthlyIncome, FinanceData, ExpenseType, FixedExpenseTemplate, FixedExpenseExclusion, CategoryGoal, CategoryGoalOverride } from '@/types/finance';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Helper to sort expenses (matches logic in Expenses.tsx)
const sortExpenses = (expenses: Expense[]) => {
  return [...expenses].sort((a, b) => {
    // If both have displayOrder set (non-zero), use that
    if (a.displayOrder !== 0 || b.displayOrder !== 0) {
      return a.displayOrder - b.displayOrder;
    }
    // Otherwise sort by date (newest first), then by createdAt
    const dateComparison = new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
    if (dateComparison !== 0) return dateComparison;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

interface FinanceContextType {
  data: FinanceData;
  loading: boolean;
  selectedPeriodId: string | null;
  setSelectedPeriodId: (id: string | null) => void;
  // Categories
  addCategory: (category: Omit<Category, 'id' | 'subcategories'>) => Promise<Category | null>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  seedDefaultCategories: () => Promise<void>;
  // Subcategories
  addSubcategory: (categoryId: string, name: string) => Promise<Subcategory | null>;
  updateSubcategory: (subcategoryId: string, name: string) => Promise<void>;
  deleteSubcategory: (categoryId: string, subcategoryId: string) => Promise<void>;
  // Expenses
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'displayOrder'>) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>, scope?: 'current' | 'future') => Promise<void>;
  deleteExpense: (id: string, scope?: 'current' | 'future') => Promise<void>;
  updateExpensesOrder: (orderedIds: string[]) => Promise<void>;
  addBulkExpenses: (expenses: Omit<Expense, 'id' | 'createdAt' | 'displayOrder'>[]) => Promise<void>;
  linkExpenseToFixed: (expenseId: string, templateId: string, csvTitle: string, exactDate: string, exactAmount: number) => Promise<void>;
  // Billing Periods
  addBillingPeriod: (period: Omit<BillingPeriod, 'id'>) => Promise<void>;
  updateBillingPeriod: (id: string, period: Partial<BillingPeriod>) => Promise<void>;
  deleteBillingPeriod: (id: string) => Promise<void>;
  // Monthly Income
  setMonthlyIncome: (billingPeriodId: string, salary: number, extra: number, extraDetails?: { id: string; name: string; amount: number }[]) => Promise<void>;
  // Goals
  setCategoryGoal: (categoryId: string, amount: number) => Promise<void>;
  setCategoryGoals: (goals: { categoryId: string; amount: number }[]) => Promise<void>;
  setCategoryGoalOverride: (categoryId: string, billingPeriodId: string, amount: number) => Promise<void>;
  getGoalForCategory: (categoryId: string, billingPeriodId: string) => number;
  deleteCategoryGoalOverride: (categoryId: string, billingPeriodId: string) => Promise<void>;
  // Helpers
  getExpensesForPeriod: (periodId: string) => Expense[];
  getIncomeForPeriod: (periodId: string) => MonthlyIncome | undefined;
  getCategoryById: (id: string) => Category | undefined;
  getSubcategoryById: (categoryId: string, subcategoryId: string) => Subcategory | undefined;
  getBillingPeriodForDate: (date: string) => BillingPeriod | undefined;
  getBillingPeriodById: (id: string) => BillingPeriod | undefined;
  refreshData: () => Promise<void>;
  // Fixed expense helpers
  isFixedExpenseWithTemplate: (expense: Expense) => boolean;
}

const defaultData: FinanceData = {
  categories: [],
  expenses: [],
  billingPeriods: [],
  monthlyIncomes: [],
  fixedTemplates: [],
  fixedExclusions: [],
  goals: [],
  goalOverrides: [],
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<FinanceData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const initializationAttempted = useRef(false);

  const fetchData = useCallback(async () => {
    if (!user) {
      setData(defaultData);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch Core Data (Vital for the app to work)
      const [
        categoriesRes,
        subcategoriesRes,
        expensesRes,
        periodsRes,
        incomesRes,
        templatesRes,
        exclusionsRes,
      ] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('subcategories').select('*').order('name'),
        supabase.from('expenses').select('*').order('purchase_date', { ascending: false }),
        supabase.from('billing_periods').select('*').order('start_date', { ascending: false }),
        supabase.from('monthly_incomes').select('*'),
        supabase.from('fixed_expense_templates').select('*').order('created_at', { ascending: false }),
        supabase.from('fixed_expense_exclusions').select('*'),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (subcategoriesRes.error) throw subcategoriesRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (periodsRes.error) throw periodsRes.error;
      if (incomesRes.error) throw incomesRes.error;
      if (templatesRes.error) throw templatesRes.error;
      if (exclusionsRes.error) throw exclusionsRes.error;

      // 2. Try to fetch Goals (New feature - Optional/Safe fail)
      let goals: CategoryGoal[] = [];
      let goalOverrides: CategoryGoalOverride[] = [];

      try {
        const [goalsRes, overridesRes] = await Promise.all([
          supabase.from('category_goals').select('*'),
          supabase.from('category_goal_overrides').select('*'),
        ]);

        if (goalsRes.error) {
          console.warn('Could not fetch goals (Table might not exist yet):', goalsRes.error.message);
        } else {
          goals = (goalsRes.data || []).map(g => ({
            id: g.id,
            categoryId: g.category_id,
            amount: Number(g.amount),
          }));
        }

        if (overridesRes.error) {
          console.warn('Could not fetch goal overrides:', overridesRes.error.message);
        } else {
          goalOverrides = (overridesRes.data || []).map(o => ({
            id: o.id,
            categoryId: o.category_id,
            billingPeriodId: o.billing_period_id,
            amount: Number(o.amount),
          }));
        }
      } catch (goalsError) {
        console.warn('Error fetching goals (Feature might be disabled):', goalsError);
        // Do not crash the app, just use empty goals
      }

      // Map subcategories to categories
      const categories: Category[] = (categoriesRes.data || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        subcategories: (subcategoriesRes.data || [])
          .filter(sub => sub.category_id === cat.id)
          .map(sub => ({
            id: sub.id,
            name: sub.name,
            categoryId: sub.category_id,
          })),
      }));

      const billingPeriods: BillingPeriod[] = (periodsRes.data || []).map(p => ({
        id: p.id,
        name: p.name,
        startDate: p.start_date,
        endDate: p.end_date,
      }));

      const monthlyIncomes: MonthlyIncome[] = (incomesRes.data || []).map(i => ({
        id: i.id,
        billingPeriodId: i.billing_period_id,
        salary: Number(i.salary),
        extra: Number(i.extra),
      }));

      const expenses: Expense[] = (expensesRes.data || []).map(e => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        purchaseDate: e.purchase_date,
        categoryId: e.category_id,
        subcategoryId: e.subcategory_id || '',
        type: (e.type as ExpenseType) || 'variable',
        createdAt: e.created_at,
        fixedTemplateId: e.fixed_template_id || undefined,
        displayOrder: e.display_order ?? 0,
        originalTitle: e.original_title || undefined,
        bankOrigin: e.bank_origin || undefined,
      }));

      const fixedTemplates: FixedExpenseTemplate[] = (templatesRes.data || []).map(t => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        categoryId: t.category_id,
        subcategoryId: t.subcategory_id || '',
        startDate: t.start_date,
        endDate: t.end_date,
        isActive: t.is_active,
        createdAt: t.created_at,
        originalTitle: t.original_title || undefined,
      }));

      const fixedExclusions: FixedExpenseExclusion[] = (exclusionsRes.data || []).map(e => ({
        id: e.id,
        templateId: e.template_id,
        billingPeriodId: e.billing_period_id,
      }));

      setData({
        categories,
        expenses,
        billingPeriods,
        monthlyIncomes,
        fixedTemplates,
        fixedExclusions,
        goals,
        goalOverrides,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Initialize categories for new users (only once per session, only if never initialized before)
  const initializeCategoriesIfNeeded = useCallback(async () => {
    if (!user || initializationAttempted.current) return;
    initializationAttempted.current = true;

    try {
      // Check if user_settings exists for this user
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('categories_initialized')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsError) {
        console.error('Error fetching user settings:', settingsError);
        return;
      }

      // If already initialized, do nothing
      if (settings?.categories_initialized) {
        return;
      }

      // Check if user already has categories in the database
      const { count, error: countError } = await supabase
        .from('categories')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error('Error counting categories:', countError);
        return;
      }

      // If user has no settings record, create one
      if (!settings) {
        if ((count ?? 0) > 0) {
          // User already has categories, just mark as initialized
          await supabase
            .from('user_settings')
            .insert({ user_id: user.id, categories_initialized: true });
        } else {
          // User is new, seed defaults and mark as initialized
          await seedDefaultCategoriesInternal();
          await supabase
            .from('user_settings')
            .insert({ user_id: user.id, categories_initialized: true });
          await fetchData();
        }
      } else {
        // Settings exist but not initialized
        if ((count ?? 0) > 0) {
          // User already has categories, just mark as initialized
          await supabase
            .from('user_settings')
            .update({ categories_initialized: true })
            .eq('user_id', user.id);
        } else {
          // Seed defaults and mark as initialized
          await seedDefaultCategoriesInternal();
          await supabase
            .from('user_settings')
            .update({ categories_initialized: true })
            .eq('user_id', user.id);
          await fetchData();
        }
      }
    } catch (error) {
      console.error('Error initializing categories:', error);
    }
  }, [user, fetchData]);

  // Internal seed function that doesn't depend on local state
  const seedDefaultCategoriesInternal = async () => {
    if (!user) return;

    const defaultCategories = [
      { name: 'Alimentação', color: '#EF4444', subcategories: ['Supermercado', 'Restaurantes', 'Delivery', 'Lanches'] },
      { name: 'Transporte', color: '#F97316', subcategories: ['Combustível', 'Uber/99', 'Estacionamento', 'Manutenção'] },
      { name: 'Moradia', color: '#3B82F6', subcategories: ['Aluguel', 'Condomínio', 'Energia', 'Água', 'Internet', 'Gás'] },
      { name: 'Saúde', color: '#22C55E', subcategories: ['Plano de Saúde', 'Farmácia', 'Consultas', 'Academia'] },
      { name: 'Educação', color: '#8B5CF6', subcategories: ['Cursos', 'Livros', 'Material Escolar'] },
      { name: 'Lazer', color: '#EC4899', subcategories: ['Cinema', 'Streaming', 'Viagens', 'Hobbies'] },
      { name: 'Vestuário', color: '#14B8A6', subcategories: ['Roupas', 'Calçados', 'Acessórios'] },
      { name: 'Outros', color: '#64748B', subcategories: ['Presentes', 'Doações', 'Diversos'] },
    ];

    for (const cat of defaultCategories) {
      const { data: insertedCat, error: catError } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: cat.name,
          color: cat.color,
        })
        .select()
        .single();

      if (catError) {
        console.error('Error seeding category:', catError);
        continue;
      }

      for (const subName of cat.subcategories) {
        await supabase
          .from('subcategories')
          .insert({
            user_id: user.id,
            category_id: insertedCat.id,
            name: subName,
          });
      }
    }
  };

  // Run initialization after data is fetched and user is available
  useEffect(() => {
    if (user && !loading) {
      initializeCategoriesIfNeeded();
    }
  }, [user, loading, initializeCategoriesIfNeeded]);

  // Auto-select current period
  useEffect(() => {
    // Only auto-select if we have periods and nothing is currently selected
    // OR if the currently selected period ID doesn't exist in the data anymore (e.g. it was deleted)
    const currentSelectionExists = selectedPeriodId && data.billingPeriods.some(p => p.id === selectedPeriodId);

    if (data.billingPeriods.length > 0 && !currentSelectionExists) {
      const now = new Date();
      const currentPeriod = data.billingPeriods.find(p => {
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        return now >= start && now < end;
      });

      setSelectedPeriodId(currentPeriod ? currentPeriod.id : data.billingPeriods[0].id);
    }
  }, [data.billingPeriods, selectedPeriodId]);

  // Categories
  const addCategory = async (category: Omit<Category, 'id' | 'subcategories'>) => {
    if (!user) return null;

    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: category.name,
        color: category.color,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchData();

    // Return the formatted category object so caller can use it
    return newCategory ? {
      id: newCategory.id,
      name: newCategory.name,
      color: newCategory.color,
      subcategories: []
    } as Category : null;
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const { error } = await supabase
      .from('categories')
      .update({
        name: updates.name,
        color: updates.color,
      })
      .eq('id', id);

    if (error) throw error;
    await fetchData();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchData();
  };

  // Subcategories
  const addSubcategory = async (categoryId: string, name: string) => {
    if (!user) return null;

    const { data: newSubcategory, error } = await supabase
      .from('subcategories')
      .insert({
        user_id: user.id,
        category_id: categoryId,
        name,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchData();

    return newSubcategory ? {
      id: newSubcategory.id,
      name: newSubcategory.name,
      categoryId: newSubcategory.category_id,
    } as Subcategory : null;
  };

  const updateSubcategory = async (subcategoryId: string, name: string) => {
    const { error } = await supabase
      .from('subcategories')
      .update({ name })
      .eq('id', subcategoryId);

    if (error) throw error;
    await fetchData();
  };

  const deleteSubcategory = async (categoryId: string, subcategoryId: string) => {
    const { error } = await supabase
      .from('subcategories')
      .delete()
      .eq('id', subcategoryId);

    if (error) throw error;
    await fetchData();
  };

  // Seed default categories - now just a wrapper that calls the internal function
  const seedDefaultCategories = async () => {
    if (!user) return;

    const { count, error: countError } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('Error counting categories:', countError);
      return;
    }

    if ((count ?? 0) > 0) return;

    await seedDefaultCategoriesInternal();
    await fetchData();
  };

  // Helper to get period for an expense
  const getPeriodForExpense = (expense: Expense): BillingPeriod | undefined => {
    const expenseDate = new Date(expense.purchaseDate);
    return data.billingPeriods.find(period => {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      return expenseDate >= startDate && expenseDate < endDate;
    });
  };

  const getDayOfMonthFromISODate = (isoDate: string): number => {
    // isoDate: yyyy-MM-dd
    const day = Number(isoDate.split('-')[2]);
    return Number.isFinite(day) ? day : 1;
  };

  const getFixedPurchaseDateForPeriod = (period: BillingPeriod, desiredDayOfMonth: number): string => {
    const periodStart = parseISO(period.startDate);
    const periodEnd = parseISO(period.endDate);

    const buildCandidateInMonth = (base: Date) => {
      const lastDay = lastDayOfMonth(base).getDate();
      const safeDay = Math.min(Math.max(desiredDayOfMonth, 1), lastDay);
      return new Date(base.getFullYear(), base.getMonth(), safeDay);
    };

    // Prefer the month of the period start. If it falls before the period start, shift to next month.
    let candidate = buildCandidateInMonth(periodStart);
    if (candidate < periodStart) {
      candidate = buildCandidateInMonth(addMonths(periodStart, 1));
    }

    // Safety: if still outside the period, clamp to the last day inside the period.
    if (candidate >= periodEnd) {
      candidate = addDays(periodEnd, -1);
    }

    return format(candidate, 'yyyy-MM-dd');
  };

  // Expenses
  const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt' | 'displayOrder'>) => {
    if (!user) return;

    // Helper to calculate insertion order and update existing items
    const getInsertionOrder = async (periodId: string, purchaseDate: string): Promise<number> => {
      // Get existing expenses for this period
      const period = data.billingPeriods.find(p => p.id === periodId);
      if (!period) return 0;

      const periodExpenses = data.expenses.filter(expense => {
        const pDate = new Date(expense.purchaseDate);
        const sDate = new Date(period.startDate);
        const eDate = new Date(period.endDate);
        return pDate >= sDate && pDate < eDate;
      });

      // Check if manual ordering is active (any item has displayOrder != 0)
      const hasManualOrder = periodExpenses.some(e => e.displayOrder !== 0);

      // If no manual order, return 0 (default behavior)
      if (!hasManualOrder) return 0;

      // Sort existing items to find correct position
      const sorted = sortExpenses(periodExpenses);

      // Find insertion index
      // We want to insert where NewDate > ItemDate (since standard sort is Descending)
      // OR NewDate == ItemDate (Newer created goes top)
      const newDateTs = new Date(purchaseDate).getTime();
      let insertIndex = sorted.length;

      for (let i = 0; i < sorted.length; i++) {
        const itemDateTs = new Date(sorted[i].purchaseDate).getTime();
        // If new item is newer or same date, it goes before (above) current item
        if (newDateTs >= itemDateTs) {
          insertIndex = i;
          break;
        }
      }

      // Shift items from insertIndex onwards
      const updates = [];
      for (let i = insertIndex; i < sorted.length; i++) {
        // Only update if order implies a change (usually it does implicitly as we shift)
        // We set their order to i + 1 (since new item takes i)
        // But we must use their visual position 'i' mapping to 'i+1'
        updates.push(
          supabase
            .from('expenses')
            .update({ display_order: i + 1 })
            .eq('id', sorted[i].id)
            .eq('user_id', user.id)
        );
      }

      if (updates.length > 0) {
        await Promise.all(updates);
      }

      return insertIndex;
    };

    // If it's a fixed expense, create a template first
    if (expense.type === 'fixed') {
      // Create the template
      const { data: templateData, error: templateError } = await supabase
        .from('fixed_expense_templates')
        .insert({
          user_id: user.id,
          description: expense.description,
          amount: expense.amount,
          category_id: expense.categoryId,
          subcategory_id: expense.subcategoryId || null,
          start_date: expense.purchaseDate,
          is_active: true,
        })
        .select()
        .single();

      if (templateError) {
        toast.error('Erro ao criar despesa fixa');
        throw templateError;
      }

      // Get all periods that should have this expense
      const periods = data.billingPeriods.filter(period => {
        const periodEnd = new Date(period.endDate);
        const templateStart = new Date(expense.purchaseDate);
        return templateStart <= periodEnd;
      });

      const desiredDayOfMonth = getDayOfMonthFromISODate(expense.purchaseDate);

      // Create expenses for all applicable periods
      for (const period of periods) {
        const purchaseDate = getFixedPurchaseDateForPeriod(period, desiredDayOfMonth);
        const displayOrder = await getInsertionOrder(period.id, purchaseDate);

        await supabase.from('expenses').insert({
          user_id: user.id,
          description: expense.description,
          amount: expense.amount,
          purchase_date: purchaseDate,
          category_id: expense.categoryId,
          subcategory_id: expense.subcategoryId || null,
          type: 'fixed',
          fixed_template_id: templateData.id,
          display_order: displayOrder,
          bank_origin: expense.bankOrigin || null,
        });
      }

      await fetchData();
      toast.success('Despesa fixa criada e propagada para todos os períodos');
      return;
    }

    // Regular variable expense
    const period = getBillingPeriodForDate(expense.purchaseDate);
    let displayOrder = 0;

    if (period) {
      displayOrder = await getInsertionOrder(period.id, expense.purchaseDate);
    }

    const { error } = await supabase.from('expenses').insert({
      user_id: user.id,
      description: expense.description,
      amount: expense.amount,
      purchase_date: expense.purchaseDate,
      category_id: expense.categoryId,
      subcategory_id: expense.subcategoryId || null,
      type: expense.type || 'variable',
      display_order: displayOrder,
      bank_origin: expense.bankOrigin || null,
    });

    if (error) throw error;
    await fetchData();
    toast.success('Despesa criada com sucesso');
  };

  const addBulkExpenses = async (expensesToInsert: Omit<Expense, 'id' | 'createdAt' | 'displayOrder'>[]) => {
    if (!user || expensesToInsert.length === 0) return;

    // Helper to calculate insertion order and update existing items
    const getInsertionOrderAndUpdates = (periodId: string, itemDates: string[]) => {
      const period = data.billingPeriods.find(p => p.id === periodId);
      if (!period) return { startingIndex: 0, updates: [] };

      const periodExpenses = data.expenses.filter(expense => {
        const pDate = new Date(expense.purchaseDate);
        const sDate = new Date(period.startDate);
        const eDate = new Date(period.endDate);
        return pDate >= sDate && pDate < eDate;
      });

      const hasManualOrder = periodExpenses.some(e => e.displayOrder !== 0);
      if (!hasManualOrder) return { startingIndex: 0, updates: [] };

      const sorted = sortExpenses(periodExpenses);

      // For bulk, we find where the OLDEST item in the bunch should go
      // to shift everything below it down by the NUMBER of items we're inserting
      // (Assuming items are already sorted before this function is called, or we just use the oldest date)
      // Actually, since all items going into this period will be inserted sequentially,
      // we just need the insertion index for the OLDEST item from the batch that belongs to this period.
      // Easiest is to just shift everything based on the NEWEST item?
      // No, let's keep it simple: group by date, find index for each date, shift by 1.
      // But to be efficient, let's just find the index for the NEWEST item in the bulk, 
      // shift everything from that index down by N (the number of items belonging to this period).
      const timestamps = itemDates.map(date => new Date(date).getTime());
      const maxDateTs = Math.max(...timestamps);

      let insertIndex = sorted.length;
      for (let i = 0; i < sorted.length; i++) {
        const itemDateTs = new Date(sorted[i].purchaseDate).getTime();
        if (maxDateTs >= itemDateTs) {
          insertIndex = i;
          break;
        }
      }

      const updates: any[] = [];
      const shiftAmount = itemDates.length;
      for (let i = insertIndex; i < sorted.length; i++) {
        updates.push(
          supabase
            .from('expenses')
            .update({ display_order: i + shiftAmount })
            .eq('id', sorted[i].id)
            .eq('user_id', user.id)
        );
      }

      return { startingIndex: insertIndex, updates };
    };

    // Group expenses by period to handle display_order calculation
    const expensesByPeriod = new Map<string, Omit<Expense, 'id' | 'createdAt' | 'displayOrder'>[]>();
    const expensesWithNoPeriod: Omit<Expense, 'id' | 'createdAt' | 'displayOrder'>[] = [];

    expensesToInsert.forEach(expense => {
      const period = getBillingPeriodForDate(expense.purchaseDate);
      if (period) {
        if (!expensesByPeriod.has(period.id)) {
          expensesByPeriod.set(period.id, []);
        }
        expensesByPeriod.get(period.id)!.push(expense);
      } else {
        expensesWithNoPeriod.push(expense);
      }
    });

    const displayOrderUpdates: any[] = [];
    const finalInserts: any[] = [];

    // Process periods
    for (const [periodId, periodExpenses] of expensesByPeriod.entries()) {
      const dates = periodExpenses.map(e => e.purchaseDate);
      const { startingIndex, updates } = getInsertionOrderAndUpdates(periodId, dates);
      displayOrderUpdates.push(...updates);

      // IMPORTANT: Assign sequential display orders to the inserted items to keep them in order
      periodExpenses.forEach((expense, idx) => {
        finalInserts.push({
          user_id: user.id,
          description: expense.description,
          amount: expense.amount,
          purchase_date: expense.purchaseDate,
          category_id: expense.categoryId,
          subcategory_id: expense.subcategoryId || null,
          type: expense.type || 'variable',
          display_order: startingIndex + idx,
          original_title: expense.originalTitle || null,
          bank_origin: expense.bankOrigin || null,
        });
      });
    }

    // Process those without a period (fallback)
    expensesWithNoPeriod.forEach((expense) => {
      finalInserts.push({
        user_id: user.id,
        description: expense.description,
        amount: expense.amount,
        purchase_date: expense.purchaseDate,
        category_id: expense.categoryId,
        subcategory_id: expense.subcategoryId || null,
        type: expense.type || 'variable',
        display_order: 0,
        original_title: expense.originalTitle || null,
        bank_origin: expense.bankOrigin || null,
      });
    });

    // Run updates for existing items' order
    if (displayOrderUpdates.length > 0) {
      await Promise.all(displayOrderUpdates);
    }

    // Insert new items
    const { error } = await supabase.from('expenses').insert(finalInserts);

    if (error) {
      toast.error('Erro ao importar despesas');
      throw error;
    }

    await fetchData();
    toast.success(`${expensesToInsert.length} despesas importadas com sucesso!`);
  };

  const linkExpenseToFixed = async (expenseId: string, templateId: string, csvTitle: string, exactDate: string, exactAmount: number) => {
    if (!user) return;

    // 1. Update the instance (expense) to matching exact CSV details
    const { error: expenseError } = await supabase
      .from('expenses')
      .update({
        original_title: csvTitle,
        purchase_date: exactDate,
        amount: exactAmount
      })
      .eq('id', expenseId)
      .eq('user_id', user.id);

    if (expenseError) {
      toast.error('Erro ao atualizar a despesa');
      throw expenseError;
    }

    // 2. Update the parent template so it learns for next month
    const { error: templateError } = await supabase
      .from('fixed_expense_templates')
      .update({ original_title: csvTitle })
      .eq('id', templateId)
      .eq('user_id', user.id);

    if (templateError) {
      toast.error('Erro ao atualizar o template da despesa fixa');
      throw templateError;
    }

    await fetchData();
    toast.success('Despesa vinculada com sucesso!');
  };

  const updateExpense = async (id: string, updates: Partial<Expense>, scope: 'current' | 'future' = 'current') => {
    if (!user) return;

    const currentExpense = data.expenses.find(e => e.id === id);
    if (!currentExpense) return;

    // If it's a fixed expense with a template and scope is 'future'
    if (currentExpense.fixedTemplateId && scope === 'future') {
      const desiredDayOfMonth = updates.purchaseDate
        ? getDayOfMonthFromISODate(updates.purchaseDate)
        : getDayOfMonthFromISODate(currentExpense.purchaseDate);

      const templateUpdate: Record<string, unknown> = {
        description: updates.description,
        amount: updates.amount,
        category_id: updates.categoryId,
        subcategory_id: updates.subcategoryId || null,
      };

      // When changing the date for "este mês e todos os seguintes", we also update the template's reference date
      // so new billing periods are generated on the correct day.
      if (updates.purchaseDate !== undefined) {
        templateUpdate.start_date = updates.purchaseDate;
      }

      // Update the template
      await supabase
        .from('fixed_expense_templates')
        .update(templateUpdate)
        .eq('id', currentExpense.fixedTemplateId)
        .eq('user_id', user.id);

      // Get the current expense's period
      const currentPeriod = getPeriodForExpense(currentExpense);

      if (currentPeriod) {
        // Get all periods from this one onwards
        const futurePeriods = data.billingPeriods.filter(
          p => new Date(p.startDate) >= new Date(currentPeriod.startDate)
        );

        // Update all expenses from this period onwards that are linked to this template
        for (const period of futurePeriods) {
          const expenseInPeriod = data.expenses.find(
            e => e.fixedTemplateId === currentExpense.fixedTemplateId &&
              new Date(e.purchaseDate) >= new Date(period.startDate) &&
              new Date(e.purchaseDate) < new Date(period.endDate)
          );

          if (expenseInPeriod) {
            const updatePayload: Record<string, unknown> = {
              description: updates.description,
              amount: updates.amount,
              category_id: updates.categoryId,
              subcategory_id: updates.subcategoryId || null,
            };

            // If the user changed the date, propagate the *day* to all future periods.
            // - Current period: keep the exact date the user picked
            // - Future periods: compute a date inside each billing period with the same day-of-month
            if (updates.purchaseDate !== undefined) {
              updatePayload.purchase_date =
                expenseInPeriod.id === id
                  ? updates.purchaseDate
                  : getFixedPurchaseDateForPeriod(period, desiredDayOfMonth);
            }

            if (updates.bankOrigin !== undefined) {
              updatePayload.bank_origin = updates.bankOrigin === 'None' ? null : updates.bankOrigin;
            }

            await supabase
              .from('expenses')
              .update(updatePayload)
              .eq('id', expenseInPeriod.id)
              .eq('user_id', user.id);
          }
        }
      }

      await fetchData();
      toast.success('Despesa fixa atualizada para este mês e os seguintes');
      return;
    }

    // Update only the current expense
    const updateData: Record<string, unknown> = {};
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.purchaseDate !== undefined) updateData.purchase_date = updates.purchaseDate;
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
    if (updates.subcategoryId !== undefined) updateData.subcategory_id = updates.subcategoryId || null;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.bankOrigin !== undefined) updateData.bank_origin = updates.bankOrigin || null;

    // Handle Variable -> Fixed conversion
    if (currentExpense.type === 'variable' && updates.type === 'fixed') {
      const finalDescription = updates.description ?? currentExpense.description;
      const finalAmount = updates.amount ?? currentExpense.amount;
      const finalCategoryId = updates.categoryId ?? currentExpense.categoryId;
      const finalSubcategoryId = updates.subcategoryId !== undefined ? updates.subcategoryId : currentExpense.subcategoryId;
      const finalPurchaseDate = updates.purchaseDate ?? currentExpense.purchaseDate;

      // 1. Create the template for the new fixed expense
      const { data: templateData, error: templateError } = await supabase
        .from('fixed_expense_templates')
        .insert({
          user_id: user.id,
          description: finalDescription,
          amount: finalAmount,
          category_id: finalCategoryId,
          subcategory_id: finalSubcategoryId || null,
          start_date: finalPurchaseDate,
          is_active: true,
        })
        .select()
        .single();

      if (templateError) {
        toast.error('Erro ao converter para despesa fixa');
        throw templateError;
      }

      // Link the current expense to the newly created template
      updateData.fixed_template_id = templateData.id;

      // 2. Generate future expenses for subsequent billing periods
      const tempExpenseForPeriod = { ...currentExpense, purchaseDate: finalPurchaseDate } as Expense;
      const currentPeriod = getPeriodForExpense(tempExpenseForPeriod);

      const futurePeriods = data.billingPeriods.filter(period => {
        const periodStart = new Date(period.startDate);
        const expenseStart = currentPeriod ? new Date(currentPeriod.startDate) : new Date(finalPurchaseDate);
        return periodStart > expenseStart;
      });

      const desiredDayOfMonth = getDayOfMonthFromISODate(finalPurchaseDate);

      for (const period of futurePeriods) {
        const futurePurchaseDate = getFixedPurchaseDateForPeriod(period, desiredDayOfMonth);

        await supabase.from('expenses').insert({
          user_id: user.id,
          description: finalDescription,
          amount: finalAmount,
          purchase_date: futurePurchaseDate,
          category_id: finalCategoryId,
          subcategory_id: finalSubcategoryId || null,
          type: 'fixed',
          fixed_template_id: templateData.id,
          display_order: 0,
          bank_origin: updates.bankOrigin ?? currentExpense.bankOrigin ?? null,
        });
      }
    }

    const { error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    await fetchData();
    toast.success('Despesa atualizada com sucesso');
  };

  const deleteExpense = async (id: string, scope: 'current' | 'future' = 'current') => {
    if (!user) return;

    const currentExpense = data.expenses.find(e => e.id === id);
    if (!currentExpense) return;

    // If it's a fixed expense with a template
    if (currentExpense.fixedTemplateId) {
      const currentPeriod = getPeriodForExpense(currentExpense);

      if (scope === 'future') {
        // Deactivate the template and set end_date
        await supabase
          .from('fixed_expense_templates')
          .update({
            is_active: false,
            end_date: currentPeriod ? currentPeriod.startDate : currentExpense.purchaseDate,
          })
          .eq('id', currentExpense.fixedTemplateId)
          .eq('user_id', user.id);

        if (currentPeriod) {
          // Get all periods from this one onwards
          const futurePeriods = data.billingPeriods.filter(
            p => new Date(p.startDate) >= new Date(currentPeriod.startDate)
          );

          // Delete all expenses from this period onwards that are linked to this template
          for (const period of futurePeriods) {
            const expenseInPeriod = data.expenses.find(
              e => e.fixedTemplateId === currentExpense.fixedTemplateId &&
                new Date(e.purchaseDate) >= new Date(period.startDate) &&
                new Date(e.purchaseDate) < new Date(period.endDate)
            );

            if (expenseInPeriod) {
              await supabase
                .from('expenses')
                .delete()
                .eq('id', expenseInPeriod.id)
                .eq('user_id', user.id);
            }
          }
        }

        await fetchData();
        toast.success('Despesa fixa excluída para este mês e os seguintes');
        return;
      }

      // scope === 'current': Delete only this expense and add an exclusion
      if (currentPeriod) {
        // Add exclusion to prevent regeneration
        await supabase.from('fixed_expense_exclusions').insert({
          user_id: user.id,
          template_id: currentExpense.fixedTemplateId,
          billing_period_id: currentPeriod.id,
        });
      }
    }

    // Delete the expense
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Erro ao excluir despesa');
      throw error;
    }

    await fetchData();
    toast.success('Despesa excluída com sucesso');
  };

  // Billing Periods
  const addBillingPeriod = async (period: Omit<BillingPeriod, 'id'>) => {
    if (!user) return;

    const { data: newPeriod, error } = await supabase
      .from('billing_periods')
      .insert({
        user_id: user.id,
        name: period.name,
        start_date: period.startDate,
        end_date: period.endDate,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar período de fatura');
      throw error;
    }

    // Generate fixed expenses for the new period
    if (newPeriod) {
      // Fetch active templates
      const { data: templates } = await supabase
        .from('fixed_expense_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Fetch exclusions
      const { data: exclusions } = await supabase
        .from('fixed_expense_exclusions')
        .select('*')
        .eq('user_id', user.id);

      const periodStart = new Date(newPeriod.start_date);
      const periodEnd = new Date(newPeriod.end_date);

      for (const template of templates || []) {
        const templateStart = new Date(template.start_date);
        const templateEnd = template.end_date ? new Date(template.end_date) : null;

        // Check if period is in template's date range
        const inRange = templateStart <= periodEnd && (templateEnd === null || templateEnd >= periodStart);
        if (!inRange) continue;

        // Check if there's an exclusion
        const hasExclusion = (exclusions || []).some(
          exc => exc.template_id === template.id && exc.billing_period_id === newPeriod.id
        );
        if (hasExclusion) continue;

        // Create the expense
        const desiredDayOfMonth = getDayOfMonthFromISODate(template.start_date);
        const periodAsBillingPeriod: BillingPeriod = {
          id: newPeriod.id,
          name: newPeriod.name,
          startDate: newPeriod.start_date,
          endDate: newPeriod.end_date,
        };
        const purchaseDate = getFixedPurchaseDateForPeriod(periodAsBillingPeriod, desiredDayOfMonth);

        // Achar a última despesa associada a este template ANTERIOR ao período atual para herdar o banco
        const lastExpense = data.expenses
          .filter(e => e.fixedTemplateId === template.id && new Date(e.purchaseDate) < new Date(periodAsBillingPeriod.startDate))
          .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())[0];

        await supabase.from('expenses').insert({
          user_id: user.id,
          description: template.description,
          amount: template.amount,
          purchase_date: purchaseDate,
          category_id: template.category_id,
          subcategory_id: template.subcategory_id || null,
          type: 'fixed',
          fixed_template_id: template.id,
          bank_origin: lastExpense ? lastExpense.bankOrigin || null : null,
        });
      }
    }

    await fetchData();
    toast.success('Período de fatura criado com sucesso');
  };

  const updateBillingPeriod = async (id: string, updates: Partial<BillingPeriod>) => {
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate;

    const { error } = await supabase
      .from('billing_periods')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    await fetchData();
  };

  const deleteBillingPeriod = async (id: string) => {
    if (!user) return;
    
    const period = data.billingPeriods.find(p => p.id === id);
    if (period) {
      // Deletar as despesas que recaem neste período
      await supabase
        .from('expenses')
        .delete()
        .gte('purchase_date', period.startDate)
        .lt('purchase_date', period.endDate)
        .eq('user_id', user.id);
    }

    // Deletar as receitas do mês
    await supabase
      .from('monthly_incomes')
      .delete()
      .eq('billing_period_id', id)
      .eq('user_id', user.id);

    // Delete related exclusions first
    await supabase
      .from('fixed_expense_exclusions')
      .delete()
      .eq('billing_period_id', id)
      .eq('user_id', user.id);

    const { error } = await supabase
      .from('billing_periods')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchData();
  };

  // Monthly Income
  const setMonthlyIncome = async (billingPeriodId: string, salary: number, extra: number, extraDetails?: { id: string; name: string; amount: number }[]) => {
    if (!user) return;

    const existing = data.monthlyIncomes.find(i => i.billingPeriodId === billingPeriodId);

    if (existing) {
      const { error } = await supabase
        .from('monthly_incomes')
        .update({ salary, extra, extra_details: extraDetails || [] })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('monthly_incomes')
        .insert({
          user_id: user.id,
          billing_period_id: billingPeriodId,
          salary,
          extra,
          extra_details: extraDetails || [],
        });

      if (error) throw error;
    }

    await fetchData();
  };

  // Helpers
  const getExpensesForPeriod = (periodId: string) => {
    const period = data.billingPeriods.find(p => p.id === periodId);
    if (!period) return [];

    return data.expenses.filter(expense => {
      const purchaseDate = new Date(expense.purchaseDate);
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      return purchaseDate >= startDate && purchaseDate < endDate;
    });
  };

  const getIncomeForPeriod = (periodId: string) => {
    return data.monthlyIncomes.find(i => i.billingPeriodId === periodId);
  };

  const getCategoryById = (id: string) => {
    return data.categories.find(c => c.id === id);
  };

  const getSubcategoryById = (categoryId: string, subcategoryId: string) => {
    const category = getCategoryById(categoryId);
    return category?.subcategories.find(s => s.id === subcategoryId);
  };

  const getBillingPeriodForDate = (date: string) => {
    const targetDate = new Date(date);
    return data.billingPeriods.find(period => {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      return targetDate >= startDate && targetDate < endDate;
    });
  };

  const getBillingPeriodById = (id: string) => {
    return data.billingPeriods.find(p => p.id === id);
  };

  const isFixedExpenseWithTemplate = (expense: Expense): boolean => {
    return expense.type === 'fixed' && !!expense.fixedTemplateId;
  };

  const updateExpensesOrder = async (orderedIds: string[]) => {
    if (!user) return;

    // Update each expense with its new display_order
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('expenses')
        .update({ display_order: index })
        .eq('id', id)
        .eq('user_id', user.id)
    );

    await Promise.all(updates);

    // Update local state optimistically
    setData(prev => ({
      ...prev,
      expenses: prev.expenses.map(expense => {
        const newOrder = orderedIds.indexOf(expense.id);
        return newOrder !== -1 ? { ...expense, displayOrder: newOrder } : expense;
      }),
    }));
  };

  // Goals
  const setCategoryGoal = async (categoryId: string, amount: number) => {
    if (!user) return;

    const { error } = await supabase
      .from('category_goals')
      .upsert({
        user_id: user.id,
        category_id: categoryId,
        amount,
      }, { onConflict: 'user_id, category_id' });

    if (error) {
      console.error('Error saving goal for category:', categoryId, error); // Added logging for "Empreendimento" bug
      toast.error('Erro ao salvar meta');
      throw error;
    }

    await fetchData();
    toast.success('Meta padrão atualizada');
  };

  const setCategoryGoals = async (goals: { categoryId: string; amount: number }[]) => {
    if (!user) return;

    const upsertData = goals.map(g => ({
      user_id: user.id,
      category_id: g.categoryId,
      amount: g.amount,
    }));

    const { error } = await supabase
      .from('category_goals')
      .upsert(upsertData, { onConflict: 'user_id, category_id' });

    if (error) {
      console.error('Error batch saving goals:', error);
      toast.error('Erro ao salvar metas');
      throw error;
    }

    await fetchData();
    toast.success('Metas atualizadas com sucesso');
  };

  const setCategoryGoalOverride = async (categoryId: string, billingPeriodId: string, amount: number) => {
    if (!user) return;

    const { error } = await supabase
      .from('category_goal_overrides')
      .upsert({
        user_id: user.id,
        category_id: categoryId,
        billing_period_id: billingPeriodId,
        amount,
      }, { onConflict: 'user_id, category_id, billing_period_id' });

    if (error) {
      toast.error('Erro ao salvar meta do mês');
      throw error;
    }

    await fetchData();
    toast.success('Meta do mês atualizada');
  };

  const deleteCategoryGoalOverride = async (categoryId: string, billingPeriodId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('category_goal_overrides')
      .delete()
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .eq('billing_period_id', billingPeriodId);

    if (error) {
      toast.error('Erro ao remover meta do mês');
      throw error;
    }

    await fetchData();
  };

  const getGoalForCategory = (categoryId: string, billingPeriodId: string): number => {
    // 1. Try to find an override for this specific period
    const override = data.goalOverrides.find(
      o => o.categoryId === categoryId && o.billingPeriodId === billingPeriodId
    );
    if (override) return override.amount;

    // 2. Fallback to default goal
    const defaultGoal = data.goals.find(g => g.categoryId === categoryId);
    if (defaultGoal) return defaultGoal.amount;

    return 0;
  };

  return (
    <FinanceContext.Provider value={{
      data,
      loading,
      selectedPeriodId,
      setSelectedPeriodId,
      addCategory,
      updateCategory,
      deleteCategory,
      seedDefaultCategories,
      addSubcategory,
      updateSubcategory,
      deleteSubcategory,
      addExpense,
      addBulkExpenses,
      linkExpenseToFixed,
      updateExpense,
      deleteExpense,
      updateExpensesOrder,
      addBillingPeriod,
      updateBillingPeriod,
      deleteBillingPeriod,
      setMonthlyIncome,
      getExpensesForPeriod,
      getIncomeForPeriod,
      getCategoryById,
      getSubcategoryById,
      getBillingPeriodForDate,
      getBillingPeriodById,
      refreshData: fetchData,
      isFixedExpenseWithTemplate,
      setCategoryGoal,
      setCategoryGoals,
      setCategoryGoalOverride,
      deleteCategoryGoalOverride,
      getGoalForCategory,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
