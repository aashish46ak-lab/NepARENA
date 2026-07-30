-- eFootball Nepal — tournament engine (participants, fixtures, results, auto-archive)
-- Run AFTER 01-05. Safe to re-run.

-- History gains a third place column
alter table public.tournament_history add column if not exists third_place text;
alter table public.tournament_history add column if not exists source_tournament_id uuid;
create unique index if not exists tournament_history_source_uniq
  on public.tournament_history (source_tournament_id) where source_tournament_id is not null;

alter table public.hall_of_fame add column if not exists source_tournament_id uuid;

do $$ begin create type public.participant_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.tournament_participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  player_name text not null,
  club text,
  status public.participant_status not null default 'pending',
  seed integer,
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round integer not null default 1,
  position integer not null default 1,
  home_id uuid references public.tournament_participants(id) on delete cascade,
  away_id uuid references public.tournament_participants(id) on delete cascade,
  home_score integer,
  away_score integer,
  played boolean not null default false,
  scheduled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists matches_tournament_idx on public.matches (tournament_id, round, position);

-- GRANTs
grant select on public.tournament_participants to anon, authenticated;
grant insert, update, delete on public.tournament_participants to authenticated;
grant all on public.tournament_participants to service_role;
grant select on public.matches to anon, authenticated;
grant insert, update, delete on public.matches to authenticated;
grant all on public.matches to service_role;

alter table public.tournament_participants enable row level security;
alter table public.matches enable row level security;

drop policy if exists "participants read" on public.tournament_participants;
create policy "participants read" on public.tournament_participants for select using (true);
drop policy if exists "participants self register" on public.tournament_participants;
create policy "participants self register" on public.tournament_participants
  for insert to authenticated with check (auth.uid() = user_id or public.is_admin(auth.uid()));
drop policy if exists "participants admin upd" on public.tournament_participants;
create policy "participants admin upd" on public.tournament_participants
  for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "participants delete" on public.tournament_participants;
create policy "participants delete" on public.tournament_participants
  for delete to authenticated using (public.is_admin(auth.uid()) or auth.uid() = user_id);

drop policy if exists "matches read" on public.matches;
create policy "matches read" on public.matches for select using (true);
drop policy if exists "matches admin ins" on public.matches;
create policy "matches admin ins" on public.matches for insert to authenticated with check (public.is_admin(auth.uid()));
drop policy if exists "matches admin upd" on public.matches;
create policy "matches admin upd" on public.matches for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "matches admin del" on public.matches;
create policy "matches admin del" on public.matches for delete to authenticated using (public.is_admin(auth.uid()));

-- Keep tournaments.participants_count in sync with approved players
create or replace function public.sync_participants_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  tid := coalesce(new.tournament_id, old.tournament_id);
  update public.tournaments t
     set participants_count = (
       select count(*) from public.tournament_participants p
       where p.tournament_id = tid and p.status = 'approved')
   where t.id = tid;
  return null;
end $$;
drop trigger if exists participants_count_sync on public.tournament_participants;
create trigger participants_count_sync
after insert or update or delete on public.tournament_participants
for each row execute function public.sync_participants_count();

-- Standings view: points, goal difference, matches played
create or replace view public.tournament_standings as
with played as (
  select tournament_id, home_id as pid, home_score as gf, away_score as ga from public.matches where played
  union all
  select tournament_id, away_id as pid, away_score as gf, home_score as ga from public.matches where played
)
select
  p.id as participant_id,
  p.tournament_id,
  p.player_name,
  p.club,
  count(pl.pid) as played,
  count(*) filter (where pl.gf > pl.ga) as won,
  count(*) filter (where pl.gf = pl.ga) as drawn,
  count(*) filter (where pl.gf < pl.ga) as lost,
  coalesce(sum(pl.gf), 0) as goals_for,
  coalesce(sum(pl.ga), 0) as goals_against,
  coalesce(sum(pl.gf), 0) - coalesce(sum(pl.ga), 0) as goal_diff,
  (count(*) filter (where pl.gf > pl.ga)) * 3 + (count(*) filter (where pl.gf = pl.ga)) as points
from public.tournament_participants p
left join played pl on pl.pid = p.id
where p.status = 'approved'
group by p.id, p.tournament_id, p.player_name, p.club;

grant select on public.tournament_standings to anon, authenticated, service_role;

-- On completion: archive to history + hall of fame automatically
create or replace function public.archive_completed_tournament()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  top record;
  names text[] := array[]::text[];
  yr integer := extract(year from coalesce(new.ends_at, now()))::int;
  labels text[] := array['Champion','Runner-up','Third Place'];
  i integer := 1;
begin
  if new.status <> 'completed' or coalesce(old.status, 'upcoming') = 'completed' then
    return new;
  end if;

  for top in
    select player_name from public.tournament_standings
    where tournament_id = new.id
    order by points desc, goal_diff desc, goals_for desc, player_name asc
    limit 3
  loop
    names := array_append(names, top.player_name);
  end loop;

  insert into public.tournament_history
    (tournament_name, winner, runner_up, third_place, year, banner_url, prize_pool, sort_order, source_tournament_id)
  values (
    new.name,
    coalesce(names[1], 'TBD'),
    names[2], names[3],
    yr, new.banner_url, new.prize_pool, 0, new.id
  )
  on conflict (source_tournament_id) do update
    set tournament_name = excluded.tournament_name,
        winner = excluded.winner,
        runner_up = excluded.runner_up,
        third_place = excluded.third_place,
        banner_url = excluded.banner_url,
        prize_pool = excluded.prize_pool;

  delete from public.hall_of_fame where source_tournament_id = new.id;
  while i <= least(array_length(names, 1), 3) loop
    insert into public.hall_of_fame (player_name, achievement, tournament, year, sort_order, source_tournament_id)
    values (names[i], labels[i], new.name, yr, (yr * 10) + i, new.id);
    i := i + 1;
  end loop;

  return new;
end $$;

drop trigger if exists tournament_completed_archive on public.tournaments;
create trigger tournament_completed_archive
after update of status on public.tournaments
for each row execute function public.archive_completed_tournament();

-- Owner-only permanent account deletion (used by the admin dashboard)
create or replace function public.admin_delete_user(_user_id uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.has_role(auth.uid(), 'owner') then
    raise exception 'Only the owner can delete accounts';
  end if;
  if public.has_role(_user_id, 'owner') then
    raise exception 'The owner account cannot be deleted';
  end if;
  delete from auth.users where id = _user_id;
end $$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;