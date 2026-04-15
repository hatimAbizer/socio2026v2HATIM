-- Migration: 024_enable_rls_role_matrix_tables.sql
-- Purpose: Enable RLS on role matrix tables and restrict client access.

alter table if exists public.role_catalog
  enable row level security;

alter table if exists public.user_role_assignments
  enable row level security;

-- Explicit grants/revokes for API roles.
grant select on table public.role_catalog to authenticated;
grant select on table public.user_role_assignments to authenticated;

revoke all on table public.role_catalog from anon;
revoke insert, update, delete on table public.role_catalog from authenticated;

revoke all on table public.user_role_assignments from anon;
revoke insert, update, delete on table public.user_role_assignments from authenticated;

-- Role catalog is read-only to signed-in users.
drop policy if exists role_catalog_read_authenticated on public.role_catalog;
create policy role_catalog_read_authenticated
  on public.role_catalog
  for select
  to authenticated
  using (true);

-- Role assignments are visible to master admins and each user for their own row.
drop policy if exists user_role_assignments_select_scoped on public.user_role_assignments;
create policy user_role_assignments_select_scoped
  on public.user_role_assignments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users me
      where me.id = public.user_role_assignments.user_id
        and (
          (me.auth_uuid is not null and me.auth_uuid = auth.uid())
          or lower(me.email) = lower(public.current_auth_email())
        )
    )
    or exists (
      select 1
      from public.users me
      where (
          (me.auth_uuid is not null and me.auth_uuid = auth.uid())
          or lower(me.email) = lower(public.current_auth_email())
        )
        and coalesce(me.is_masteradmin, false) = true
    )
  );
