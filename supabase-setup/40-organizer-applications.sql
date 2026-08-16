-- Organizer applications + invitation enhancements (Phase 3)
create table if not exists public.organizer_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  org_name text not null,
  contact_email text not null,
  phone text,
  description text,
  logo_url text,
  banner_url text,
  facebook text,
  country text,
  game text not null default 'efootball',
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','changes_requested')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizer_applications_user_idx on public.organizer_applications (user_id);
create index if not exists organizer_applications_status_idx on public.organizer_applications (status);

alter table public.organizer_applications enable row level security;

drop policy if exists org_apps_insert_own on public.organizer_applications;
create policy org_apps_insert_own on public.organizer_applications
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists org_apps_select_own on public.organizer_applications;
create policy org_apps_select_own on public.organizer_applications
  for select to authenticated
  using (auth.uid() = user_id);

grant select, insert, update on public.organizer_applications to authenticated;

alter table public.organizers add column if not exists primary_game text default 'efootball';
alter table public.organizers add column if not exists setup_completed boolean not null default false;

alter table public.organizer_invitations add column if not exists tournament_id uuid references public.tournaments(id) on delete set null;
alter table public.organizer_invitations add column if not exists game text;
alter table public.organizer_invitations add column if not exists role text default 'owner';
alter table public.organizer_invitations add column if not exists accepted_at timestamptz;
