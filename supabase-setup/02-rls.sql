-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.site_settings enable row level security;
alter table public.tournaments enable row level security;
alter table public.announcements enable row level security;
alter table public.hall_of_fame enable row level security;
alter table public.tournament_history enable row level security;
alter table public.gallery enable row level security;
alter table public.sponsors enable row level security;
alter table public.community_links enable row level security;
alter table public.owner_info enable row level security;
alter table public.moderators enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (true);
drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "roles read" on public.user_roles;
create policy "roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'owner'));
drop policy if exists "roles owner insert" on public.user_roles;
create policy "roles owner insert" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(), 'owner'));
drop policy if exists "roles owner delete" on public.user_roles;
create policy "roles owner delete" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(), 'owner'));

do $$
declare t text;
begin
  foreach t in array array['site_settings','tournaments','announcements','hall_of_fame','tournament_history','gallery','sponsors','community_links','owner_info','moderators']
  loop
    execute format('drop policy if exists "%s read" on public.%I;', t, t);
    execute format('create policy "%s read" on public.%I for select using (true);', t, t);
    execute format('drop policy if exists "%s admin ins" on public.%I;', t, t);
    execute format('create policy "%s admin ins" on public.%I for insert to authenticated with check (public.is_admin(auth.uid()));', t, t);
    execute format('drop policy if exists "%s admin upd" on public.%I;', t, t);
    execute format('create policy "%s admin upd" on public.%I for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));', t, t);
    execute format('drop policy if exists "%s admin del" on public.%I;', t, t);
    execute format('create policy "%s admin del" on public.%I for delete to authenticated using (public.is_admin(auth.uid()));', t, t);
  end loop;
end $$;
