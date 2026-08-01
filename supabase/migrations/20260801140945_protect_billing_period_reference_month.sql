-- Keep one billing period per reference month for each user.
CREATE UNIQUE INDEX IF NOT EXISTS billing_periods_user_reference_month_unique
  ON public.billing_periods (user_id, lower(btrim(name)));

-- A billing period cannot end before it starts.
ALTER TABLE public.billing_periods
  ADD CONSTRAINT billing_periods_valid_date_range
  CHECK (start_date <= end_date);

-- Updating a period must preserve ownership as well as match the owned row.
ALTER POLICY "Users can update their own billing_periods"
  ON public.billing_periods
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
