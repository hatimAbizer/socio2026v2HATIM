-- Migration: 020_remove_security_role.sql
-- Purpose: Remove deprecated Security service role and related legacy data.
-- Safe to run multiple times.

update public.users
set university_role = null
where lower(coalesce(university_role, '')) in ('service_security', 'security_service', 'security');

alter table if exists public.users
  drop column if exists is_service_security;

do $$
begin
  if to_regclass('public.events') is not null and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'additional_requests'
  ) then
    update public.events
    set additional_requests = coalesce(additional_requests, '{}'::jsonb) - 'security'
    where coalesce(additional_requests, '{}'::jsonb) ? 'security';
  end if;
end $$;

do $$
begin
  if to_regclass('public.service_decisions') is not null then
    delete from public.service_decisions where role_code = 'SERVICE_SECURITY';
  end if;

  if to_regclass('public.service_requests') is not null then
    delete from public.service_requests where service_role_code = 'SERVICE_SECURITY';
  end if;

  if to_regclass('public.approval_decisions') is not null then
    delete from public.approval_decisions where role_code = 'SERVICE_SECURITY';
  end if;

  if to_regclass('public.approval_steps') is not null then
    delete from public.approval_steps where role_code = 'SERVICE_SECURITY';
  end if;

  if to_regclass('public.user_role_assignments') is not null then
    delete from public.user_role_assignments where role_code = 'SERVICE_SECURITY';
  end if;

  if to_regclass('public.role_capabilities') is not null then
    delete from public.role_capabilities where role_code = 'SERVICE_SECURITY';
  end if;

  if to_regclass('public.role_catalog') is not null then
    delete from public.role_catalog where role_code = 'SERVICE_SECURITY';
  end if;
end $$;

alter table if exists public.approval_steps
  drop constraint if exists approval_steps_role_code_chk;

alter table if exists public.approval_decisions
  drop constraint if exists approval_decisions_role_code_chk;

alter table if exists public.service_requests
  drop constraint if exists service_requests_role_code_chk;

alter table if exists public.service_decisions
  drop constraint if exists service_decisions_role_code_chk;

do $$
begin
  if to_regclass('public.approval_steps') is not null then
    alter table public.approval_steps
      add constraint approval_steps_role_code_chk
      check (
        role_code in (
          'MASTER_ADMIN',
          'SUPPORT',
          'HOD',
          'DEAN',
          'CFO',
          'ACCOUNTS',
          'FINANCE_OFFICER',
          'ORGANIZER_TEACHER',
          'ORGANIZER_STUDENT',
          'ORGANIZER_VOLUNTEER',
          'SERVICE_IT',
          'SERVICE_VENUE',
          'SERVICE_CATERING',
          'SERVICE_STALLS'
        )
      );
  end if;

  if to_regclass('public.approval_decisions') is not null then
    alter table public.approval_decisions
      add constraint approval_decisions_role_code_chk
      check (
        role_code in (
          'MASTER_ADMIN',
          'SUPPORT',
          'HOD',
          'DEAN',
          'CFO',
          'ACCOUNTS',
          'FINANCE_OFFICER',
          'ORGANIZER_TEACHER',
          'ORGANIZER_STUDENT',
          'ORGANIZER_VOLUNTEER',
          'SERVICE_IT',
          'SERVICE_VENUE',
          'SERVICE_CATERING',
          'SERVICE_STALLS'
        )
      );
  end if;

  if to_regclass('public.service_requests') is not null then
    alter table public.service_requests
      add constraint service_requests_role_code_chk
      check (
        service_role_code in (
          'SERVICE_IT',
          'SERVICE_VENUE',
          'SERVICE_CATERING',
          'SERVICE_STALLS'
        )
      );
  end if;

  if to_regclass('public.service_decisions') is not null then
    alter table public.service_decisions
      add constraint service_decisions_role_code_chk
      check (
        role_code in (
          'SERVICE_IT',
          'SERVICE_VENUE',
          'SERVICE_CATERING',
          'SERVICE_STALLS'
        )
      );
  end if;
end $$;
