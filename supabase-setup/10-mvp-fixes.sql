-- =============================================================
-- 10 — MVP fixes: notifications table, submission columns,
--      notify_admins() function, realtime publication.
-- Idempotent — safe to run multiple times.
-- =============================================================

-- 1) Notifications (in-app bell + device alerts)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'general',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update on public.notifications to authenticated;
grant all on public.notifications to service_role;

alter table public.notifications enable row level security;

drop policy if exists "notif read own" on public.notifications;
create policy "notif read own" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notif insert" on public.notifications;
create policy "notif insert" on public.notifications
  for insert to authenticated with check (true);

drop policy if exists "notif update own" on public.notifications;
create policy "notif update own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 2) match_submissions: columns the app writes (screenshot proof + review time)
alter table public.match_submissions add column if not exists proof_url text;
alter table public.match_submissions add column if not exists reviewed_at timestamptz;

-- Players may update ONLY their own submission, and only back to "pending"
-- (resubmit after rejection). Approving/rejecting stays admin-only.
drop policy if exists "subs update own resubmit" on public.match_submissions;
create policy "subs update own resubmit" on public.match_submissions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and status = 'pending');

-- 3) notify_admins(): lets any signed-in user alert owner/admin/moderator
--    (RLS on user_roles would otherwise hide admin ids from members)
create or replace function public.notify_admins(_title text, _body text, _link text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into public.notifications (user_id, title, body, type, link)
  select ur.user_id, _title, _body, 'admin', _link
  from public.user_roles ur
  where ur.role::text in ('owner', 'admin', 'moderator')
  group by ur.user_id;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.notify_admins(text, text, text) to authenticated;

-- 4) Realtime: stream changes so UI updates without page reloads
do $$
declare
  t text;
begin
  foreach t in array array[
    'notifications',
    'matches',
    'matchdays',
    'match_submissions',
    'tournament_standings',
    'tournament_participants'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;