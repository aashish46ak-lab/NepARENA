-- User ↔ User follows (independent of organizer_followers)
-- Run in Supabase SQL Editor

create table if not exists public.user_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);

create index if not exists user_follows_following_idx
  on public.user_follows (following_id);

create index if not exists user_follows_follower_idx
  on public.user_follows (follower_id);

alter table public.user_follows enable row level security;

drop policy if exists "uf_select_all" on public.user_follows;
create policy "uf_select_all" on public.user_follows
  for select using (true);

drop policy if exists "uf_insert_own" on public.user_follows;
create policy "uf_insert_own" on public.user_follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists "uf_delete_own" on public.user_follows;
create policy "uf_delete_own" on public.user_follows
  for delete using (auth.uid() = follower_id);

-- Optional realtime
do $$ begin
  alter publication supabase_realtime add table public.user_follows;
exception when duplicate_object then null;
end $$;
