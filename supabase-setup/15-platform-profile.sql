-- Editable NepARENA platform profile (homepage)
create table if not exists public.platform_profile (
  id int primary key default 1 check (id = 1),
  banner_url text,
  logo_url text,
  tagline text,
  about text,
  updated_at timestamptz not null default now()
);

insert into public.platform_profile (id, tagline, about)
values (
  1,
  'Nepal''s Multi-Organizer eFootball Platform',
  'Verified organizers build independent esports communities.'
)
on conflict (id) do nothing;

alter table public.platform_profile enable row level security;

drop policy if exists "pp_public_read" on public.platform_profile;
create policy "pp_public_read" on public.platform_profile
  for select using (true);

drop policy if exists "pp_auth_update" on public.platform_profile;
create policy "pp_auth_update" on public.platform_profile
  for update using (auth.role() = 'authenticated');

drop policy if exists "pp_auth_insert" on public.platform_profile;
create policy "pp_auth_insert" on public.platform_profile
  for insert with check (auth.role() = 'authenticated');
