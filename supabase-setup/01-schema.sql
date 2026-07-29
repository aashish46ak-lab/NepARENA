-- eFootball Nepal — Schema
create extension if not exists "pgcrypto";

do $$ begin create type public.app_role as enum ('owner','moderator','member');
exception when duplicate_object then null; end $$;
do $$ begin create type public.tournament_status as enum ('upcoming','registration_open','ongoing','completed');
exception when duplicate_object then null; end $$;
do $$ begin create type public.sponsor_tier as enum ('platinum','gold','silver','partner');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique, full_name text, avatar_url text,
  favourite_club text, bio text,
  created_at timestamptz not null default now()
);
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null, unique (user_id, role)
);
create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  site_name text not null default 'eFootball Nepal',
  tagline text not null default 'The official home of competitive eFootball in Nepal.',
  logo_url text,
  hero_title text not null default 'Nepal''s home for competitive eFootball',
  hero_subtitle text not null default 'Tournaments, rankings, and a growing community of Nepali eFootball players.',
  hero_image_url text,
  about_short text not null default 'eFootball Nepal is the official platform organizing competitive eFootball tournaments and community events across Nepal.',
  footer_text text not null default '© eFootball Nepal',
  updated_at timestamptz not null default now()
);
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null, description text, banner_url text,
  status public.tournament_status not null default 'upcoming',
  registration_open boolean not null default false,
  prize_pool text, participants_count integer not null default 0,
  starts_at timestamptz, ends_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null, body text not null, image_url text,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.hall_of_fame (
  id uuid primary key default gen_random_uuid(),
  player_name text not null, achievement text not null,
  tournament text, photo_url text, year integer, sort_order integer not null default 0
);
create table if not exists public.tournament_history (
  id uuid primary key default gen_random_uuid(),
  tournament_name text not null, winner text not null, runner_up text,
  year integer not null, banner_url text, prize_pool text, sort_order integer not null default 0
);
create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  image_url text not null, caption text, sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null, logo_url text, website_url text,
  tier public.sponsor_tier not null default 'partner', sort_order integer not null default 0
);
create table if not exists public.community_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null, label text not null, url text not null,
  icon text, sort_order integer not null default 0
);
create table if not exists public.owner_info (
  id uuid primary key default gen_random_uuid(),
  name text not null, title text not null, bio text not null default '',
  photo_url text, email text, contact text
);
create table if not exists public.moderators (
  id uuid primary key default gen_random_uuid(),
  name text not null, role_title text not null default 'Moderator',
  bio text, photo_url text, sort_order integer not null default 0
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('owner','moderator'))
$$;

-- GRANTs
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
grant select on public.user_roles to authenticated;
grant insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

do $$
declare t text;
begin
  foreach t in array array['site_settings','tournaments','announcements','hall_of_fame','tournament_history','gallery','sponsors','community_links','owner_info','moderators']
  loop
    execute format('grant select on public.%I to anon, authenticated;', t);
    execute format('grant insert, update, delete on public.%I to authenticated;', t);
    execute format('grant all on public.%I to service_role;', t);
  end loop;
end $$;
