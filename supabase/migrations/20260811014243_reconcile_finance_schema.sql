-- Reconcile the versioned schema with columns already consumed by the app.
-- This migration is intentionally idempotent and does not reinterpret history.

alter table if exists public.expenses
  add column if not exists is_reserve boolean,
  add column if not exists is_fulfilled boolean,
  add column if not exists fulfilled_at timestamptz,
  add column if not exists original_title text;

update public.expenses
set is_reserve = false
where is_reserve is null;

update public.expenses
set is_fulfilled = false
where is_fulfilled is null;

alter table if exists public.expenses
  alter column is_reserve set default false,
  alter column is_reserve set not null,
  alter column is_fulfilled set default false,
  alter column is_fulfilled set not null;

comment on column public.expenses.is_reserve is
  'Marks a period allocation that is tracked separately from card consumption.';
comment on column public.expenses.is_fulfilled is
  'Whether the user confirmed that a reserve allocation was separated.';
comment on column public.expenses.fulfilled_at is
  'Timestamp when a reserve allocation was marked as separated.';
comment on column public.expenses.original_title is
  'Original imported statement title used for reconciliation and classification assistance.';

alter table if exists public.fixed_expense_templates
  add column if not exists is_reserve boolean,
  add column if not exists original_title text;

update public.fixed_expense_templates
set is_reserve = false
where is_reserve is null;

alter table if exists public.fixed_expense_templates
  alter column is_reserve set default false,
  alter column is_reserve set not null;

comment on column public.fixed_expense_templates.is_reserve is
  'Propagates reserve semantics to materialized period entries.';
comment on column public.fixed_expense_templates.original_title is
  'Original imported statement title retained for future reconciliation.';

alter table if exists public.monthly_incomes
  add column if not exists extra_details jsonb;

update public.monthly_incomes
set extra_details = '[]'
where extra_details is null;

alter table if exists public.monthly_incomes
  alter column extra_details set default '[]',
  alter column extra_details set not null;

comment on column public.monthly_incomes.extra_details is
  'Structured breakdown of additional income registered for the billing period.';
