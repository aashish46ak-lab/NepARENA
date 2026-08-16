-- Phase 2: Multi-game tournament foundation (additive)
alter table public.tournaments
  add column if not exists game text not null default 'efootball';
alter table public.tournaments
  add column if not exists game_config jsonb not null default '{}'::jsonb;
create index if not exists tournaments_game_idx on public.tournaments (game);

alter table public.tournament_participants
  add column if not exists game_payload jsonb not null default '{}'::jsonb;
alter table public.tournament_participants
  add column if not exists team_name text;
alter table public.tournament_participants
  add column if not exists captain_user_id uuid references auth.users(id) on delete set null;

create table if not exists public.tournament_br_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round_number integer not null default 1,
  match_number integer not null default 1,
  title text,
  lobby_id text,
  lobby_password text,
  scheduled_at timestamptz,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tournament_br_matches_tid on public.tournament_br_matches (tournament_id);

create table if not exists public.tournament_br_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.tournament_br_matches(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  participant_id uuid not null references public.tournament_participants(id) on delete cascade,
  placement integer,
  kills integer not null default 0,
  placement_points integer not null default 0,
  kill_points integer not null default 0,
  total_points integer not null default 0,
  evidence_url text,
  notes text,
  submitted_by uuid references auth.users(id) on delete set null,
  verified_by uuid references auth.users(id) on delete set null,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  unique (match_id, participant_id)
);
create index if not exists tournament_br_results_tid on public.tournament_br_results (tournament_id);

create table if not exists public.tournament_series (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round_label text,
  bracket_position integer,
  team_a_id uuid references public.tournament_participants(id) on delete set null,
  team_b_id uuid references public.tournament_participants(id) on delete set null,
  series_format text not null default 'bo1',
  score_a integer not null default 0,
  score_b integer not null default 0,
  winner_id uuid references public.tournament_participants(id) on delete set null,
  scheduled_at timestamptz,
  status text not null default 'scheduled',
  evidence_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tournament_series_tid on public.tournament_series (tournament_id);

create table if not exists public.tournament_disputes (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  against_participant_id uuid references public.tournament_participants(id) on delete set null,
  match_ref text,
  category text not null default 'other',
  description text not null,
  evidence_url text,
  status text not null default 'open',
  organizer_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tournament_disputes_tid on public.tournament_disputes (tournament_id);

alter table public.tournament_br_matches enable row level security;
alter table public.tournament_br_results enable row level security;
alter table public.tournament_series enable row level security;
alter table public.tournament_disputes enable row level security;

grant select, insert, update, delete on public.tournament_br_matches to authenticated;
grant select on public.tournament_br_matches to anon;
grant select, insert, update, delete on public.tournament_br_results to authenticated;
grant select on public.tournament_br_results to anon;
grant select, insert, update, delete on public.tournament_series to authenticated;
grant select on public.tournament_series to anon;
grant select, insert, update on public.tournament_disputes to authenticated;
