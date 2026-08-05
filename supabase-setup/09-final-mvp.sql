-- =============================================================
-- 09 — Final MVP: Admin role, registration fee, match submissions
-- Run AFTER 01-08.
-- NOTE: Postgres cannot use a freshly-added enum value in the same
-- transaction. If this finishes with a NOTICE telling you to re-run
-- it, simply run the file once more.
-- =============================================================

-- 1) Roles: owner (Super Admin), admin, moderator, member
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'app_role' and e.enumlabel = 'admin'
  ) then
    execute 'alter type public.app_role add value ''admin''';
    raise notice 'Added the admin role. If a NOTICE below asks you to re-run this script, run it once more.';
  end if;
end $$;

-- 2) is_admin(): owner + admin + moderator can manage content.
--    (role::text cast keeps this working even before the new enum value commits)
create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role::text in ('owner', 'admin', 'moderator')
  )
$$;

-- 3) New-user trigger: auto-grant Owner and Admin roles by email
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;

  if lower(new.email) = 'aashish46ak@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'owner')
    on conflict (user_id, role) do nothing;
  elsif lower(new.email) = 'anjanshyamaaa@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end $$;

-- 4) Grant the Admin role to anjanshyamaaa@gmail.com if the account already exists
do $$
begin
  insert into public.user_roles (user_id, role)
  select id, 'admin'::public.app_role
  from auth.users
  where lower(email) = 'anjanshyamaaa@gmail.com'
  on conflict (user_id, role) do nothing;
exception
  when others then
    raise notice 'Admin grant deferred until the new enum value commits — re-run this script once.';
end $$;

-- 5) Registration fee on tournaments (NPR per player; 0 = free entry)
alter table public.tournaments
  add column if not exists registration_fee numeric not null default 0;

-- 6) Player result submissions (screenshot + note, admin approval workflow)
create table if not exists public.match_submissions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  participant_id uuid not null references public.tournament_participants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  home_score integer,
  away_score integer,
  screenshot_url text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- One active submission per player per match (a rejected one can be replaced)
create unique index if not exists match_submissions_active_uq
  on public.match_submissions (match_id, participant_id)
  where status <> 'rejected';

grant select, insert on public.match_submissions to authenticated;
grant update, delete on public.match_submissions to authenticated;
grant all on public.match_submissions to service_role;

alter table public.match_submissions enable row level security;

drop policy if exists "subs read own or admin" on public.match_submissions;
create policy "subs read own or admin" on public.match_submissions
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "subs insert own" on public.match_submissions;
create policy "subs insert own" on public.match_submissions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "subs admin update" on public.match_submissions;
create policy "subs admin update" on public.match_submissions
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "subs admin delete" on public.match_submissions;
create policy "subs admin delete" on public.match_submissions
  for delete to authenticated
  using (public.is_admin(auth.uid()));