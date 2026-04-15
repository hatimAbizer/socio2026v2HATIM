-- Migration: 023_bootstrap_role_matrix_tables.sql
-- Purpose: Create role matrix tables in environments where approval tables exist but RBAC tables are missing.

create extension if not exists pgcrypto;

create table if not exists public.role_catalog (
  id uuid primary key default gen_random_uuid(),
  role_code text not null unique,
  role_name text not null,
  description text,
  is_service_role boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role_code text not null references public.role_catalog(role_code) on delete cascade,
  campus_scope text,
  department_scope text,
  school_scope text,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  is_active boolean not null default true,
  assigned_by text,
  assigned_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_role_assignments_user_id_idx
  on public.user_role_assignments(user_id);

create index if not exists user_role_assignments_role_code_idx
  on public.user_role_assignments(role_code);

create index if not exists user_role_assignments_scope_idx
  on public.user_role_assignments(campus_scope, department_scope);

create index if not exists user_role_assignments_school_scope_idx
  on public.user_role_assignments ((lower(trim(school_scope))))
  where school_scope is not null and trim(school_scope) <> '';

insert into public.role_catalog (role_code, role_name, description, is_service_role, is_active)
values
  ('MASTER_ADMIN', 'Master Admin', 'Global system visibility and edit access.', false, true),
  ('SUPPORT', 'Support', 'Operational support role retained for compatibility.', false, true),
  ('HOD', 'Head of Department', 'Department-level approver.', false, true),
  ('DEAN', 'Dean', 'School-level approver.', false, true),
  ('CFO', 'CFO', 'Campus budget approver.', false, true),
  ('ACCOUNTS', 'Accounts', 'Accounts/final budget approver.', false, true),
  ('FINANCE_OFFICER', 'Finance Officer', 'Finance operations role.', false, true),
  ('ORGANIZER_TEACHER', 'Organizer Teacher', 'Can create fests and events.', false, true),
  ('ORGANIZER_STUDENT', 'Organizer Student', 'Can create scoped events under approved fests.', false, true),
  ('ORGANIZER_VOLUNTEER', 'Organizer Volunteer', 'Volunteer dashboard role.', false, true),
  ('SERVICE_IT', 'IT Services', 'Service queue role.', true, true),
  ('SERVICE_VENUE', 'Venue Services', 'Service queue role.', true, true),
  ('SERVICE_CATERING', 'Catering', 'Service queue role.', true, true),
  ('SERVICE_STALLS', 'Stalls', 'Service queue role.', true, true)
on conflict (role_code)
do update set
  role_name = excluded.role_name,
  description = excluded.description,
  is_service_role = excluded.is_service_role,
  is_active = true,
  updated_at = now();

insert into public.user_role_assignments (
  user_id,
  role_code,
  campus_scope,
  department_scope,
  school_scope,
  valid_from,
  is_active,
  assigned_by,
  assigned_reason
)
select
  u.id,
  role_map.role_code,
  role_map.campus_scope,
  role_map.department_scope,
  role_map.school_scope,
  now(),
  true,
  'system:migration_023',
  role_map.assigned_reason
from public.users u
join lateral (
  values
    ('MASTER_ADMIN'::text, null::text, null::text, null::text, case when coalesce(u.is_masteradmin, false) then 'Backfilled from users.is_masteradmin' else null end),
    ('SUPPORT'::text, null::text, null::text, null::text, case when coalesce(u.is_support, false) then 'Backfilled from users.is_support' else null end),
    ('ORGANIZER_TEACHER'::text, null::text, null::text, null::text, case when coalesce(u.is_organiser, false) then 'Backfilled from users.is_organiser' else null end),
    ('ORGANIZER_STUDENT'::text, null::text, null::text, null::text, case when coalesce(u.is_organiser_student, false) then 'Backfilled from users.is_organiser_student' else null end),
    ('ORGANIZER_VOLUNTEER'::text, null::text, null::text, null::text, case when coalesce(u.is_volunteer, false) then 'Backfilled from users.is_volunteer' else null end),
    ('HOD'::text, nullif(trim(u.campus), ''), nullif(trim(u.department), ''), null::text, case when coalesce(u.is_hod, false) then 'Backfilled from users.is_hod' else null end),
    ('DEAN'::text, nullif(trim(u.campus), ''), nullif(trim(u.school), ''), nullif(trim(u.school), ''), case when coalesce(u.is_dean, false) then 'Backfilled from users.is_dean' else null end),
    ('CFO'::text, nullif(trim(u.campus), ''), null::text, null::text, case when coalesce(u.is_cfo, false) then 'Backfilled from users.is_cfo' else null end),
    ('FINANCE_OFFICER'::text, nullif(trim(u.campus), ''), null::text, null::text, case when coalesce((to_jsonb(u) ->> 'is_finance_officer')::boolean, false) or coalesce(u.is_finance_office, false) then 'Backfilled from users finance flags' else null end),
    ('ACCOUNTS'::text, nullif(trim(u.campus), ''), null::text, null::text, case when coalesce((to_jsonb(u) ->> 'is_finance_officer')::boolean, false) or coalesce(u.is_finance_office, false) then 'Backfilled from users finance flags' else null end),
    ('SERVICE_IT'::text, nullif(trim(u.campus), ''), null::text, null::text, case when coalesce(u.is_service_it, false) then 'Backfilled from users.is_service_it' else null end),
    ('SERVICE_VENUE'::text, nullif(trim(u.campus), ''), null::text, null::text, case when coalesce(u.is_service_venue, false) then 'Backfilled from users.is_service_venue' else null end),
    ('SERVICE_CATERING'::text, nullif(trim(u.campus), ''), null::text, null::text, case when coalesce(u.is_service_catering, false) then 'Backfilled from users.is_service_catering' else null end),
    ('SERVICE_STALLS'::text, nullif(trim(u.campus), ''), null::text, null::text, case when coalesce(u.is_service_stalls, false) then 'Backfilled from users.is_service_stalls' else null end)
) as role_map(role_code, campus_scope, department_scope, school_scope, assigned_reason)
  on role_map.assigned_reason is not null
where not exists (
  select 1
  from public.user_role_assignments ura
  where ura.user_id = u.id
    and ura.role_code = role_map.role_code
    and coalesce(ura.is_active, true) = true
    and (ura.valid_until is null or ura.valid_until > now())
);
