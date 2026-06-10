-- Add is_ignored column to expenses and fixed_expense_templates
ALTER TABLE public.expenses ADD COLUMN is_ignored BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.fixed_expense_templates ADD COLUMN is_ignored BOOLEAN NOT NULL DEFAULT false;
