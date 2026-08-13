-- Platform messages: admin can list all + mark read_by_admin
-- Run in Supabase SQL Editor after deploy.

alter table public.platform_messages
  add column if not exists sender_name text,
  add column if not exists image_url text;

-- Super-admin helper (emails must match SUPER_ADMIN_EMAILS in app)
create or replace function public.is_platform_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    lower((auth.jwt() ->> 'email')),
    ''
  ) in (
    'aashish46ak@gmail.com',
    'baralk851@gmail.com'
  );
$$;

drop policy if exists "pm_select_own" on public.platform_messages;
create policy "pm_select_own" on public.platform_messages
  for select using (
    auth.uid() = user_id
    or public.is_platform_super_admin()
  );

drop policy if exists "pm_insert_own" on public.platform_messages;
create policy "pm_insert_own" on public.platform_messages
  for insert with check (
    (auth.uid() = user_id and is_from_admin = false)
    or (public.is_platform_super_admin() and is_from_admin = true)
  );

drop policy if exists "pm_update_admin_read" on public.platform_messages;
create policy "pm_update_admin_read" on public.platform_messages
  for update using (
    public.is_platform_super_admin()
    or auth.uid() = user_id
  )
  with check (
    public.is_platform_super_admin()
    or auth.uid() = user_id
  );

-- RPC: mark a thread read for admin (always works for super admins)
create or replace function public.admin_mark_platform_thread_read(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if not public.is_platform_super_admin() then
    raise exception 'not allowed';
  end if;
  update public.platform_messages
  set read_by_admin = true
  where user_id = p_user_id
    and is_from_admin = false
    and coalesce(read_by_admin, false) = false;
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.admin_mark_platform_thread_read(uuid) to authenticated;
grant execute on function public.is_platform_super_admin() to authenticated;
