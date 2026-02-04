export interface Category {
  id: string;
  name: string;
  color: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

export type ExpenseType = 'fixed' | 'variable';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  purchaseDate: string; // data da compra
  categoryId: string;
  subcategoryId: string;
  type: ExpenseType; // fixa ou variável
  createdAt: string; // data de criação do registro
  fixedTemplateId?: string; // referência ao template de despesa fixa
  displayOrder: number; // ordem de exibição manual
}

export interface FixedExpenseTemplate {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
  subcategoryId: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface FixedExpenseExclusion {
  id: string;
  templateId: string;
  billingPeriodId: string;
}

export interface BillingPeriod {
  id: string;
  name: string; // ex: "Janeiro"
  startDate: string; // ex: "2025-01-06"
  endDate: string; // ex: "2025-02-06"
}

export interface MonthlyIncome {
  id: string;
  billingPeriodId: string;
  salary: number;
  extra: number;
}

export interface FinanceData {
  categories: Category[];
  expenses: Expense[];
  billingPeriods: BillingPeriod[];
  monthlyIncomes: MonthlyIncome[];
  fixedTemplates: FixedExpenseTemplate[];
  fixedExclusions: FixedExpenseExclusion[];
  goals: CategoryGoal[];
  goalOverrides: CategoryGoalOverride[];
}

export interface CategoryGoal {
  id: string;
  categoryId: string;
  amount: number;
}

export interface CategoryGoalOverride {
  id: string;
  categoryId: string;
  billingPeriodId: string;
  amount: number;
}
