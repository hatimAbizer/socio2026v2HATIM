-- 031_add_fest_budget_columns.sql
-- Adds optional fest budget columns used by dashboard and approval context queries.

alter table if exists public.fests
  add column if not exists budget_amount numeric,
  add column if not exists estimated_budget_amount numeric,
  add column if not exists total_estimated_expense numeric;

-- Legacy compatibility: some environments may still reference `public.fest`.
alter table if exists public.fest
  add column if not exists budget_amount numeric,
  add column if not exists estimated_budget_amount numeric,
  add column if not exists total_estimated_expense numeric;
