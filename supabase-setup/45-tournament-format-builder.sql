-- Flexible competition format builder (stages, legs, groups, qualification)
-- Safe to re-run. Does not break existing tournaments.
--
-- NOTE: public.tournament_standings is a VIEW (see 06-tournament-engine.sql),
-- not a table — do NOT ALTER it. Group standings can use matches.group_key.

-- Tournament-level format config (JSON). Existing bracket_type remains for compat.
alter table public.tournaments
  add column if not exists format_config jsonb not null default '{}'::jsonb;

comment on column public.tournaments.format_config is
  'Competition format: { preset, stages[], points, tieBreakers, qualification, ... }';

-- Match metadata for multi-stage / multi-leg tournaments
alter table public.matches add column if not exists stage_id text;
alter table public.matches add column if not exists stage_type text;
alter table public.matches add column if not exists group_key text;
alter table public.matches add column if not exists leg integer not null default 1;
alter table public.matches add column if not exists series_key text;
alter table public.matches add column if not exists aggregate_home integer;
alter table public.matches add column if not exists aggregate_away integer;
alter table public.matches add column if not exists is_aggregate_decider boolean not null default false;

create index if not exists matches_stage_idx
  on public.matches (tournament_id, stage_id, round, leg, position);
create index if not exists matches_series_idx
  on public.matches (tournament_id, series_key)
  where series_key is not null;

-- Seed format_config from existing bracket_type for rows that still have empty config
update public.tournaments
set format_config = jsonb_build_object(
  'preset', bracket_type,
  'version', 1,
  'migratedFrom', bracket_type
)
where (format_config is null or format_config = '{}'::jsonb)
  and bracket_type is not null;
