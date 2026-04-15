-- Migration: 022_dean_school_scope_alignment.sql
-- Purpose: Align Dean role assignments with school scope and keep legacy scope columns in sync.

alter table if exists public.user_role_assignments
  add column if not exists school_scope text;

update public.user_role_assignments ura
set
  school_scope = resolved_school,
  department_scope = resolved_school
from (
  select
    u.id as user_id,
    coalesce(
      nullif(trim(u.school_id), ''),
      nullif(trim(u.school), ''),
      nullif(trim(ura2.school_scope), ''),
      nullif(trim(ura2.department_scope), '')
    ) as resolved_school
  from public.user_role_assignments ura2
  join public.users u
    on u.id = ura2.user_id
  where upper(coalesce(ura2.role_code, '')) = 'DEAN'
) scoped_dean
where ura.user_id = scoped_dean.user_id
  and upper(coalesce(ura.role_code, '')) = 'DEAN'
  and coalesce(trim(scoped_dean.resolved_school), '') <> '';

create index if not exists user_role_assignments_school_scope_idx
  on public.user_role_assignments ((lower(trim(school_scope))))
  where school_scope is not null and trim(school_scope) <> '';
