-- Migration: add_notifications_and_fixes
-- Goal: add Module 11 notification storage with direct-user + role-targeted visibility.

create extension if not exists pgcrypto;

create table if not exists public.notifications (
	id uuid primary key default gen_random_uuid(),
	user_id uuid,
	target_role text,
	event_id uuid,
	title text not null,
	message text,
	is_read boolean not null default false,
	created_at timestamptz not null default now()
);

alter table public.notifications
	add column if not exists user_id uuid,
	add column if not exists target_role text,
	add column if not exists is_read boolean not null default false,
	add column if not exists created_at timestamptz not null default now();

do $$
declare
	v_event_id_udt text;
begin
	select c.udt_name
	into v_event_id_udt
	from information_schema.columns c
	where c.table_schema = 'public'
		and c.table_name = 'notifications'
		and c.column_name = 'event_id';

	if v_event_id_udt is not null and v_event_id_udt <> 'uuid' then
		if not exists (
			select 1
			from information_schema.columns c
			where c.table_schema = 'public'
				and c.table_name = 'notifications'
				and c.column_name = 'legacy_event_id'
		) then
			execute 'alter table public.notifications rename column event_id to legacy_event_id';
		else
			execute 'alter table public.notifications drop column event_id';
		end if;

		execute 'alter table public.notifications add column if not exists event_id uuid';
	end if;
end $$;

alter table public.notifications
	add column if not exists event_id uuid;

do $$
begin
	if exists (
		select 1
		from information_schema.columns c
		where c.table_schema = 'public'
			and c.table_name = 'notifications'
			and c.column_name = 'read'
	) then
		execute '
			update public.notifications
			set is_read = coalesce(is_read, read)
			where is_read is distinct from read
		';
	end if;
end $$;

create index if not exists idx_notifications_user_id_unread_created
	on public.notifications(user_id, is_read, created_at desc);

create index if not exists idx_notifications_target_role_unread_created
	on public.notifications(target_role, is_read, created_at desc);

create index if not exists idx_notifications_event_id
	on public.notifications(event_id);

alter table public.notifications enable row level security;

drop policy if exists "Allow all access to notifications" on public.notifications;
drop policy if exists notifications_select_own_or_role on public.notifications;

create policy notifications_select_own_or_role
on public.notifications
for select
using (
	coalesce(user_id::text, '') = auth.uid()::text
	or exists (
		select 1
		from public.users u
		where coalesce(u.auth_uuid::text, '') = auth.uid()::text
			and lower(coalesce(u.university_role::text, '')) = lower(coalesce(public.notifications.target_role, ''))
	)
);
