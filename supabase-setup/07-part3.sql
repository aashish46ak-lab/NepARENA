-- eFootball Nepal — Part 3: advanced tournament platform, roles, profiles, analytics
-- Run AFTER 01-06. Safe to re-run.

-- ============ Tournament lifecycle statuses ============
alter type public.tournament_status add value if not exists 'draft';
alter type public.tournament_status add value if not exists 'registration_closed';
alter type public.tournament_status add value if not exists 'check_in';
alter type public.tournament_status add value if not exists 'live';
alter type public.tournament_status add value if not exists 'archived';

-- ============ Tournament extras ============
alter table public.tournaments add column if not exists is_published boolean not null default true;
alter table public.tournaments add column if not exists is_featured boolean not null default false;
alter table public.tournaments add column if not exists logo_url text;
alter table public.tournaments add column if not exists rules_url text;
alter table public.tournaments add column if not exists prize_image_url text;
alter table public.tournaments add column if not exists bracket_type text not null default 'round_robin';

-- ============ Profile extras ============
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists social_links jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists is_suspended boolean not null default false;
alter table public.profiles add column if not exists has_password boolean not null default false;
create unique index if not exists profiles_username_lower_uniq
  on public.profiles (lower(username)) where username is not null;

-- ============ Participant extras ============
alter table public.tournament_participants add column if not exists photo_url text;
alter table public.tournament_participants add column if not exists club_logo_url text;

-- ============ Matchdays ============
create table if not exists public.matchdays (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists matchdays_tournament_idx on public.matchdays (tournament_id, sort_order);

grant select on public.matchdays to anon, authenticated;
grant insert, update, delete on public.matchdays to authenticated;
grant all on public.matchdays to service_role;

alter table public.matchdays enable row level security;
drop policy if exists "matchdays read" on public.matchdays;
create policy "matchdays read" on public.matchdays for select
  using (is_published or public.is_admin(auth.uid()));
drop policy if exists "matchdays admin ins" on public.matchdays;
create policy "matchdays admin ins" on public.matchdays for insert to authenticated
  with check (public.is_admin(auth.uid()));
drop policy if exists "matchdays admin upd" on public.matchdays;
create policy "matchdays admin upd" on public.matchdays for update to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "matchdays admin del" on public.matchdays;
create policy "matchdays admin del" on public.matchdays for delete to authenticated
  using (public.is_admin(auth.uid()));

-- ============ Match extras (scheduling + live state) ============
alter table public.matches add column if not exists matchday_id uuid references public.matchdays(id) on delete set null;
alter table public.matches add column if not exists status text not null default 'scheduled';
alter table public.matches add column if not exists venue text;
alter table public.matches add column if not exists platform text;
alter table public.matches add column if not exists stream_url text;
alter table public.matches add column if not exists referee text;
alter table public.matches add column if not exists proof_url text;

-- ============ Activity logs (admin audit trail) ============
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.activity_logs to authenticated;
grant all on public.activity_logs to service_role;
alter table public.activity_logs enable row level security;
drop policy if exists "logs admin read" on public.activity_logs;
create policy "logs admin read" on public.activity_logs for select to authenticated
  using (public.is_admin(auth.uid()));
drop policy if exists "logs admin insert" on public.activity_logs;
create policy "logs admin insert" on public.activity_logs for insert to authenticated
  with check (public.is_admin(auth.uid()));

-- ============ Community link click tracking ============
alter table public.community_links add column if not exists clicks integer not null default 0;
create or replace function public.increment_community_click(_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.community_links set clicks = clicks + 1 where id = _id;
$$;
revoke all on function public.increment_community_click(uuid) from public;
grant execute on function public.increment_community_click(uuid) to anon, authenticated;

-- ============ Public member directory (excludes Owner + suspended) ============
create or replace view public.public_members as
  select p.id, p.username, p.full_name, p.avatar_url, p.favourite_club, p.bio,
         p.country, p.social_links, p.created_at
  from public.profiles p
  where not public.has_role(p.id, 'owner') and not p.is_suspended;
grant select on public.public_members to anon, authenticated, service_role;

-- Public moderator badge lookup (only exposes moderator user ids)
create or replace view public.public_member_roles as
  select user_id, role from public.user_roles where role = 'moderator';
grant select on public.public_member_roles to anon, authenticated, service_role;

-- ============ Moderator role -> public Moderators section auto-sync ============
alter table public.moderators add column if not exists user_id uuid;
create unique index if not exists moderators_user_uniq
  on public.moderators (user_id) where user_id is not null;

create or replace function public.sync_moderator_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.role = 'moderator' then
    insert into public.moderators (name, role_title, photo_url, user_id, sort_order)
    select coalesce(nullif(p.full_name, ''), nullif(p.username, ''), 'Moderator'),
           'Moderator', p.avatar_url, p.id, 100
    from public.profiles p where p.id = new.user_id
    on conflict (user_id) where user_id is not null do nothing;
  elsif tg_op = 'DELETE' and old.role = 'moderator' then
    delete from public.moderators where user_id = old.user_id;
  end if;
  return null;
end $$;
drop trigger if exists moderator_role_sync on public.user_roles;
create trigger moderator_role_sync
after insert or delete on public.user_roles
for each row execute function public.sync_moderator_role();