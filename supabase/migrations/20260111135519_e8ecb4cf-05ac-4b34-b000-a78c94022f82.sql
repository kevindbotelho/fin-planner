-- Create table for fixed expense templates
CREATE TABLE public.fixed_expense_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category_id UUID NOT NULL,
  subcategory_id UUID,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create table for tracking exclusions (to prevent deleted fixed expenses from reappearing)
CREATE TABLE public.fixed_expense_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_id UUID NOT NULL REFERENCES public.fixed_expense_templates(id) ON DELETE CASCADE,
  billing_period_id UUID NOT NULL REFERENCES public.billing_periods(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(template_id, billing_period_id)
);

-- Add fixed_template_id column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN fixed_template_id UUID REFERENCES public.fixed_expense_templates(id) ON DELETE SET NULL;

-- Enable RLS on fixed_expense_templates
ALTER TABLE public.fixed_expense_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fixed_expense_templates"
ON public.fixed_expense_templates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fixed_expense_templates"
ON public.fixed_expense_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fixed_expense_templates"
ON public.fixed_expense_templates
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fixed_expense_templates"
ON public.fixed_expense_templates
FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on fixed_expense_exclusions
ALTER TABLE public.fixed_expense_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fixed_expense_exclusions"
ON public.fixed_expense_exclusions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fixed_expense_exclusions"
ON public.fixed_expense_exclusions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fixed_expense_exclusions"
ON public.fixed_expense_exclusions
FOR DELETE
USING (auth.uid() = user_id);