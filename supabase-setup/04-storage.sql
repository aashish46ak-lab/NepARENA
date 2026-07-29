insert into storage.buckets (id, name, public) values ('efn-public','efn-public',true)
on conflict (id) do update set public = true;

drop policy if exists "efn read" on storage.objects;
create policy "efn read" on storage.objects for select using (bucket_id = 'efn-public');
drop policy if exists "efn upload" on storage.objects;
create policy "efn upload" on storage.objects for insert to authenticated with check (bucket_id = 'efn-public');
drop policy if exists "efn update" on storage.objects;
create policy "efn update" on storage.objects for update to authenticated
  using (bucket_id = 'efn-public' and (owner = auth.uid() or public.is_admin(auth.uid())))
  with check (bucket_id = 'efn-public');
drop policy if exists "efn delete" on storage.objects;
create policy "efn delete" on storage.objects for delete to authenticated
  using (bucket_id = 'efn-public' and (owner = auth.uid() or public.is_admin(auth.uid())));
