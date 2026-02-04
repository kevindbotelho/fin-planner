-- Create table for Default Category Goals
create table public.category_goals (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null default auth.uid (),
  category_id uuid not null,
  amount numeric not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null,
  constraint category_goals_pkey primary key (id),
  constraint category_goals_category_id_fkey foreign key (category_id) references categories (id) on delete cascade
);

-- Create table for Category Goal Overrides (Monthly)
create table public.category_goal_overrides (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null default auth.uid (),
  category_id uuid not null,
  billing_period_id uuid not null,
  amount numeric not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null,
  constraint category_goal_overrides_pkey primary key (id),
  constraint category_goal_overrides_category_id_fkey foreign key (category_id) references categories (id) on delete cascade,
  constraint category_goal_overrides_billing_period_id_fkey foreign key (billing_period_id) references billing_periods (id) on delete cascade
);

-- Add simple RLS policies
alter table public.category_goals enable row level security;
alter table public.category_goal_overrides enable row level security;

create policy "Users can view their own goals" on public.category_goals
  for select using (auth.uid() = user_id);

create policy "Users can insert their own goals" on public.category_goals
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own goals" on public.category_goals
  for update using (auth.uid() = user_id);

create policy "Users can delete their own goals" on public.category_goals
  for delete using (auth.uid() = user_id);

create policy "Users can view their own goal overrides" on public.category_goal_overrides
  for select using (auth.uid() = user_id);

create policy "Users can insert their own goal overrides" on public.category_goal_overrides
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own goal overrides" on public.category_goal_overrides
  for update using (auth.uid() = user_id);

create policy "Users can delete their own goal overrides" on public.category_goal_overrides
  for delete using (auth.uid() = user_id);
