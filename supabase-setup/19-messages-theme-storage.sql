-- Theme column on organizers
alter table public.organizers
  add column if not exists theme_id text default 'black-silver';

-- Message image columns
alter table public.platform_messages
  add column if not exists image_url text;
alter table public.platform_messages
  add column if not exists sender_name text;

alter table public.organizer_messages
  add column if not exists image_url text;
alter table public.organizer_messages
  add column if not exists sender_name text;

-- Storage buckets (public)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('public', 'public', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- Public read + authenticated write policies
do $$ begin
  create policy "storage_public_read" on storage.objects
    for select to anon, authenticated using (bucket_id in ('avatars','public','media'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "storage_auth_upload" on storage.objects
    for insert to authenticated with check (bucket_id in ('avatars','public','media'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "storage_auth_update" on storage.objects
    for update to authenticated using (bucket_id in ('avatars','public','media'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "platform_messages_insert_own" on public.platform_messages
    for insert to authenticated with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "platform_messages_select" on public.platform_messages
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "organizer_messages_insert" on public.organizer_messages
    for insert to authenticated with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "organizer_messages_select" on public.organizer_messages
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;
