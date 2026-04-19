-- Migration: Add organizing school support for events and fests
-- Purpose:
-- 1) add organizing_school columns to events/fests
-- 2) enforce canonical school/department rules without adding new tables
-- 3) keep "Clubs and Centres" flexible for custom department names

-- -----------------------------------------------------------------
-- Add columns on existing tables only
-- -----------------------------------------------------------------
alter table if exists public.events
  add column if not exists organizing_school text;

alter table if exists public.fests
  add column if not exists organizing_school text;

-- -----------------------------------------------------------------
-- Backfill organizing_school from existing organizing_dept
-- -----------------------------------------------------------------
update public.events
set organizing_school = case
  when lower(btrim(organizing_dept)) in (
    'department of business and management (bba)',
    'department of business and management (mba)',
    'department of hotel management'
  ) then 'School of Business and Management'
  when lower(btrim(organizing_dept)) in (
    'department of commerce',
    'department of professional studies'
  ) then 'School of Commerce Finance and Accountancy'
  when lower(btrim(organizing_dept)) in (
    'department of english and cultural studies',
    'department of music',
    'department of performing arts',
    'department of philosophy and theology',
    'department of theatre studies'
  ) then 'School of Humanities and Performing Arts'
  when lower(btrim(organizing_dept)) in (
    'department of law',
    'department of school of law'
  ) then 'School of Law'
  when lower(btrim(organizing_dept)) in (
    'department of psychology',
    'department of education',
    'department of school of education',
    'department of social work'
  ) then 'School of Psychological Sciences, Education and Social Work'
  when lower(btrim(organizing_dept)) in (
    'department of chemistry',
    'department of computer science',
    'department of life sciences',
    'department of mathematics',
    'department of physics and electronics',
    'department of statistics and data science'
  ) then 'School of Sciences'
  when lower(btrim(organizing_dept)) in (
    'department of economics',
    'department of international studies, political science and history',
    'department of media studies',
    'department of sociology'
  ) then 'School of Social Sciences'
  when lower(btrim(organizing_dept)) in (
    'student welfare office',
    'national cadet corps',
    'other clubs and centres'
  ) then 'Clubs and Centres'
  else organizing_school
end
where (organizing_school is null or btrim(organizing_school) = '')
  and organizing_dept is not null
  and btrim(organizing_dept) <> '';

update public.fests
set organizing_school = case
  when lower(btrim(organizing_dept)) in (
    'department of business and management (bba)',
    'department of business and management (mba)',
    'department of hotel management'
  ) then 'School of Business and Management'
  when lower(btrim(organizing_dept)) in (
    'department of commerce',
    'department of professional studies'
  ) then 'School of Commerce Finance and Accountancy'
  when lower(btrim(organizing_dept)) in (
    'department of english and cultural studies',
    'department of music',
    'department of performing arts',
    'department of philosophy and theology',
    'department of theatre studies'
  ) then 'School of Humanities and Performing Arts'
  when lower(btrim(organizing_dept)) in (
    'department of law',
    'department of school of law'
  ) then 'School of Law'
  when lower(btrim(organizing_dept)) in (
    'department of psychology',
    'department of education',
    'department of school of education',
    'department of social work'
  ) then 'School of Psychological Sciences, Education and Social Work'
  when lower(btrim(organizing_dept)) in (
    'department of chemistry',
    'department of computer science',
    'department of life sciences',
    'department of mathematics',
    'department of physics and electronics',
    'department of statistics and data science'
  ) then 'School of Sciences'
  when lower(btrim(organizing_dept)) in (
    'department of economics',
    'department of international studies, political science and history',
    'department of media studies',
    'department of sociology'
  ) then 'School of Social Sciences'
  when lower(btrim(organizing_dept)) in (
    'student welfare office',
    'national cadet corps',
    'other clubs and centres'
  ) then 'Clubs and Centres'
  else organizing_school
end
where (organizing_school is null or btrim(organizing_school) = '')
  and organizing_dept is not null
  and btrim(organizing_dept) <> '';

-- -----------------------------------------------------------------
-- Check constraints for allowed school names (no extra table needed)
-- -----------------------------------------------------------------
do $$
begin
  if to_regclass('public.events') is not null then
    if exists (
      select 1
      from pg_constraint
      where conname = 'chk_events_organizing_school_allowed'
        and conrelid = 'public.events'::regclass
    ) then
      alter table public.events
        drop constraint chk_events_organizing_school_allowed;
    end if;

    alter table public.events
      add constraint chk_events_organizing_school_allowed
      check (
        organizing_school is null
        or organizing_school in (
          'School of Business and Management',
          'School of Commerce Finance and Accountancy',
          'School of Humanities and Performing Arts',
          'School of Law',
          'School of Psychological Sciences, Education and Social Work',
          'School of Sciences',
          'School of Social Sciences',
          'Clubs and Centres'
        )
      )
      not valid;

    create index if not exists idx_events_organizing_school
      on public.events(organizing_school);
  end if;

  if to_regclass('public.fests') is not null then
    if exists (
      select 1
      from pg_constraint
      where conname = 'chk_fests_organizing_school_allowed'
        and conrelid = 'public.fests'::regclass
    ) then
      alter table public.fests
        drop constraint chk_fests_organizing_school_allowed;
    end if;

    alter table public.fests
      add constraint chk_fests_organizing_school_allowed
      check (
        organizing_school is null
        or organizing_school in (
          'School of Business and Management',
          'School of Commerce Finance and Accountancy',
          'School of Humanities and Performing Arts',
          'School of Law',
          'School of Psychological Sciences, Education and Social Work',
          'School of Sciences',
          'School of Social Sciences',
          'Clubs and Centres'
        )
      )
      not valid;

    create index if not exists idx_fests_organizing_school
      on public.fests(organizing_school);
  end if;
end $$;

-- -----------------------------------------------------------------
-- Validation trigger:
-- For all schools except Clubs and Centres, organizing_dept must match
-- canonical department list for that selected school.
-- -----------------------------------------------------------------
create or replace function public.validate_school_department_pair()
returns trigger
language plpgsql
as $$
declare
  normalized_school text := btrim(coalesce(new.organizing_school, ''));
  normalized_dept text := btrim(coalesce(new.organizing_dept, ''));
begin
  if normalized_school = '' then
    return new;
  end if;

  if normalized_school not in (
    'School of Business and Management',
    'School of Commerce Finance and Accountancy',
    'School of Humanities and Performing Arts',
    'School of Law',
    'School of Psychological Sciences, Education and Social Work',
    'School of Sciences',
    'School of Social Sciences',
    'Clubs and Centres'
  ) then
    raise exception 'Invalid organizing_school (%)', normalized_school
      using errcode = '23514';
  end if;

  if normalized_dept = '' then
    return new;
  end if;

  if normalized_school = 'Clubs and Centres' then
    return new;
  end if;

  if normalized_school = 'School of Business and Management'
    and normalized_dept not in (
      'Department of Business and Management (BBA)',
      'Department of Business and Management (MBA)',
      'Department of Hotel Management'
    ) then
    raise exception 'Invalid organizing_dept (%) for organizing_school (%)', normalized_dept, normalized_school
      using errcode = '23514';
  end if;

  if normalized_school = 'School of Commerce Finance and Accountancy'
    and normalized_dept not in (
      'Department of Commerce',
      'Department of Professional Studies'
    ) then
    raise exception 'Invalid organizing_dept (%) for organizing_school (%)', normalized_dept, normalized_school
      using errcode = '23514';
  end if;

  if normalized_school = 'School of Humanities and Performing Arts'
    and normalized_dept not in (
      'Department of English and Cultural Studies',
      'Department of Music',
      'Department of Performing Arts',
      'Department of Philosophy and Theology',
      'Department of Theatre Studies'
    ) then
    raise exception 'Invalid organizing_dept (%) for organizing_school (%)', normalized_dept, normalized_school
      using errcode = '23514';
  end if;

  if normalized_school = 'School of Law'
    and normalized_dept not in (
      'Department of Law',
      'Department of School of Law'
    ) then
    raise exception 'Invalid organizing_dept (%) for organizing_school (%)', normalized_dept, normalized_school
      using errcode = '23514';
  end if;

  if normalized_school = 'School of Psychological Sciences, Education and Social Work'
    and normalized_dept not in (
      'Department of Psychology',
      'Department of Education',
      'Department of School of Education',
      'Department of Social Work'
    ) then
    raise exception 'Invalid organizing_dept (%) for organizing_school (%)', normalized_dept, normalized_school
      using errcode = '23514';
  end if;

  if normalized_school = 'School of Sciences'
    and normalized_dept not in (
      'Department of Chemistry',
      'Department of Computer Science',
      'Department of Life Sciences',
      'Department of Mathematics',
      'Department of Physics and Electronics',
      'Department of Statistics and Data Science'
    ) then
    raise exception 'Invalid organizing_dept (%) for organizing_school (%)', normalized_dept, normalized_school
      using errcode = '23514';
  end if;

  if normalized_school = 'School of Social Sciences'
    and normalized_dept not in (
      'Department of Economics',
      'Department of International Studies, Political Science and History',
      'Department of Media Studies',
      'Department of Sociology'
    ) then
    raise exception 'Invalid organizing_dept (%) for organizing_school (%)', normalized_dept, normalized_school
      using errcode = '23514';
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.events') is not null then
    drop trigger if exists trg_events_validate_school_department on public.events;
    create trigger trg_events_validate_school_department
      before insert or update of organizing_school, organizing_dept
      on public.events
      for each row
      execute function public.validate_school_department_pair();
  end if;

  if to_regclass('public.fests') is not null then
    drop trigger if exists trg_fests_validate_school_department on public.fests;
    create trigger trg_fests_validate_school_department
      before insert or update of organizing_school, organizing_dept
      on public.fests
      for each row
      execute function public.validate_school_department_pair();
  end if;
end $$;

-- -----------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------
select 'events.organizing_school' as check_name,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'organizing_school'
  ) as ok
union all
select 'fests.organizing_school' as check_name,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'fests'
      and column_name = 'organizing_school'
  ) as ok;