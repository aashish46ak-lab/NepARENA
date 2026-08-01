-- eFootball Nepal — Part 4: invitations, reports, extended tournament fields
-- Run AFTER 01-07. Safe to re-run.

-- Extended tournament fields
alter table public.tournaments add column if not exists rules_text text;
alter table public.tournaments add column if not exists registration_deadline timestamptz;
alter table public.tournaments add column if not exists max_players integer;
alter table public.tournaments add column if not exists theme_color text;
alter table public.tournaments add column if not exists image_url text;

-- Extended match fields (penalties, extra time, notes)
alter table public.matches add column if not exists penalty_home integer;
alter table public.matches add column if not exists penalty_away integer;
alter table public.matches add column if not exists extra_time text;
alter table public.matches add column if not exists notes text;

-- Tournament invitations
do $$ begin create type public.invitation_status as enum ('pending','accepted','rejected','expired');
exception when duplicate_object then null; end $$;

create table if not exists public.tournament_invitations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid references auth.users(id) on delete set null,
  status public.invitation_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (tournament_id, user_id)
);

grant select on public.tournament_invitations to authenticated;
grant insert, update, delete on public.tournament_invitations to authenticated;
grant all on public.tournament_invitations to service_role;

alter table public.tournament_invitations enable row level security;

drop policy if exists "invitations admin all" on public.tournament_invitations;
create policy "invitations admin all" on public.tournament_invitations
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
drop policy if exists "invitations read own" on public.tournament_invitations;
create policy "invitations read own" on public.tournament_invitations
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "invitations respond own" on public.tournament_invitations;
create policy "invitations respond own" on public.tournament_invitations
  for update to authenticated
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status in ('accepted','rejected'));

-- Reports
do $$ begin create type public.report_status as enum ('pending','in_review','resolved','dismissed');
exception when duplicate_object then null; end $$;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  type text not null default 'other',
  tournament_id uuid references public.tournaments(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  player_name text,
  reason text not null,
  description text,
  screenshot_url text,
  status public.report_status not null default 'pending',
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

grant select, insert on public.reports to authenticated;
grant update, delete on public.reports to authenticated;
grant all on public.reports to service_role;

alter table public.reports enable row level security;

drop policy if exists "reports insert own" on public.reports;
create policy "reports insert own" on public.reports
  for insert to authenticated with check (auth.uid() = reporter_id);
drop policy if exists "reports read own" on public.reports;
create policy "reports read own" on public.reports
  for select to authenticated using (auth.uid() = reporter_id or public.is_admin(auth.uid()));
drop policy if exists "reports admin upd" on public.reports;
create policy "reports admin upd" on public.reports
  for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "reports admin del" on public.reports;
create policy "reports admin del" on public.reports
  for delete to authenticated using (public.is_admin(auth.uid()));

create or replace function public.report_status_stamp()
returns trigger language plpgsql as $$
begin
  if new.status = 'resolved' and old.status <> 'resolved' then
    new.resolved_at := now();
  end if;
  return new;
end $$;
drop trigger if exists reports_status_stamp on public.reports;
create trigger reports_status_stamp
before update on public.reports
for each row execute function public.report_status_stamp();