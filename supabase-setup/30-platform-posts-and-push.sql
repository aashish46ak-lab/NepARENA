-- 30: platform posts flag + web push subscriptions
-- Run manually in Supabase SQL editor

-- Official NepARENA platform posts (display as NepARENA logo/name)
alter table public.posts
  add column if not exists is_platform boolean not null default false;

create index if not exists posts_is_platform_idx on public.posts (is_platform) where is_platform = true;

-- Web Push subscriptions (browser endpoints)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text,
  auth text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push_upsert_own" on public.push_subscriptions;
create policy "push_upsert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_update_own" on public.push_subscriptions;
create policy "push_update_own" on public.push_subscriptions
  for update using (auth.uid() = user_id);

drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

comment on column public.posts.is_platform is 'When true, feed shows NepARENA name + logo instead of author profile';
