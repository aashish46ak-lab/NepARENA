-- Platform admin chat (NepARENA only)
create table if not exists public.platform_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  is_from_admin boolean not null default false,
  read_by_admin boolean not null default false,
  read_by_user boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists platform_messages_user_id_idx
  on public.platform_messages (user_id, created_at);

alter table public.platform_messages enable row level security;

drop policy if exists "pm_select_own" on public.platform_messages;
create policy "pm_select_own" on public.platform_messages
  for select using (auth.uid() = user_id);

drop policy if exists "pm_insert_own" on public.platform_messages;
create policy "pm_insert_own" on public.platform_messages
  for insert with check (auth.uid() = user_id and is_from_admin = false);

do $$ begin
  alter publication supabase_realtime add table public.platform_messages;
exception when duplicate_object then null;
end $$;
