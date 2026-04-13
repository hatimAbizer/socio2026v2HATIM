-- Migration: 020_scope_alignment_and_event_budgets.sql
-- Purpose: Align HOD/Dean scope data and ensure event budget table exists.

create extension if not exists pgcrypto;

alter table if exists public.user_role_assignments
  add column if not exists school_scope text;

update public.user_role_assignments
set school_scope = department_scope
where upper(coalesce(role_code, '')) = 'DEAN'
  and coalesce(trim(school_scope), '') = ''
  and coalesce(trim(department_scope), '') <> '';

create index if not exists user_role_assignments_dean_school_scope_idx
  on public.user_role_assignments ((lower(trim(school_scope))))
  where school_scope is not null and trim(school_scope) <> '';

alter table if exists public.approval_requests
  add column if not exists organizing_school text;

create index if not exists approval_requests_org_scope_idx
  on public.approval_requests ((lower(trim(organizing_dept))), (lower(trim(organizing_school))));

update public.approval_requests ar
set
  organizing_dept = coalesce(nullif(trim(ar.organizing_dept), ''), e.organizing_dept),
  organizing_school = coalesce(nullif(trim(ar.organizing_school), ''), e.organizing_school)
from public.events e
where trim(coalesce(ar.entity_ref, '')) = trim(coalesce(e.event_id, ''))
  and upper(coalesce(ar.entity_type, '')) in ('EVENT', 'STANDALONE_EVENT', 'FEST_CHILD_EVENT')
  and (
    coalesce(trim(ar.organizing_dept), '') = ''
    or coalesce(trim(ar.organizing_school), '') = ''
  );

update public.approval_requests ar
set
  organizing_dept = coalesce(nullif(trim(ar.organizing_dept), ''), f.organizing_dept),
  organizing_school = coalesce(nullif(trim(ar.organizing_school), ''), f.organizing_school)
from public.fests f
where trim(coalesce(ar.entity_ref, '')) = trim(coalesce(f.fest_id, ''))
  and upper(coalesce(ar.entity_type, '')) = 'FEST'
  and (
    coalesce(trim(ar.organizing_dept), '') = ''
    or coalesce(trim(ar.organizing_school), '') = ''
  );

do $$
begin
  if to_regclass('public.fest') is not null then
    execute '
      update public.approval_requests ar
      set
        organizing_dept = coalesce(nullif(trim(ar.organizing_dept), ''''), fest.organizing_dept),
        organizing_school = coalesce(nullif(trim(ar.organizing_school), ''''), fest.organizing_school)
      from public.fest fest
      where trim(coalesce(ar.entity_ref, '''')) = trim(coalesce(fest.fest_id, ''''))
        and upper(coalesce(ar.entity_type, '''')) = ''FEST''
        and (
          coalesce(trim(ar.organizing_dept), '''') = ''''
          or coalesce(trim(ar.organizing_school), '''') = ''''
        )';
  end if;
end $$;

create table if not exists public.event_budgets (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(event_id) on delete cascade,
  total_estimated_expense numeric not null default 0,
  total_actual_expense numeric not null default 0,
  advance_paid numeric not null default 0,
  settlement_status text not null default 'draft',
  finance_status text not null default 'pending',
  settlement_submitted_at timestamptz,
  settlement_closed_at timestamptz,
  settlement_closed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_budgets_event_id_unique unique (event_id)
);

alter table if exists public.event_budgets
  add column if not exists total_estimated_expense numeric not null default 0,
  add column if not exists total_actual_expense numeric not null default 0,
  add column if not exists advance_paid numeric not null default 0,
  add column if not exists settlement_status text not null default 'draft',
  add column if not exists finance_status text not null default 'pending',
  add column if not exists settlement_submitted_at timestamptz,
  add column if not exists settlement_closed_at timestamptz,
  add column if not exists settlement_closed_by text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists event_budgets_event_id_idx
  on public.event_budgets (event_id);

create index if not exists event_budgets_finance_status_idx
  on public.event_budgets (finance_status);

create index if not exists event_budgets_settlement_status_idx
  on public.event_budgets (settlement_status);
