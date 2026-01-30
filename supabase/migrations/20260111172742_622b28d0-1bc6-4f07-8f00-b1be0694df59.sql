-- Add display_order column to expenses for manual sorting
ALTER TABLE public.expenses 
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Create an index for better performance on ordering
CREATE INDEX idx_expenses_display_order ON public.expenses(user_id, display_order);