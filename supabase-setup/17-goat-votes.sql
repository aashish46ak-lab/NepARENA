-- GOAT poll (Messi vs Ronaldo)
create table if not exists public.goat_votes (
  option text primary key check (option in ('messi', 'ronaldo')),
  votes int not null default 0,
  updated_at timestamptz default now()
);

insert into public.goat_votes (option, votes)
values ('messi', 0), ('ronaldo', 0)
on conflict (option) do nothing;

alter table public.goat_votes enable row level security;

-- Public read
drop policy if exists "goat_votes_read" on public.goat_votes;
create policy "goat_votes_read"
  on public.goat_votes for select
  to anon, authenticated
  using (true);

-- Anyone can upsert vote counts (simple community poll)
drop policy if exists "goat_votes_upsert" on public.goat_votes;
create policy "goat_votes_upsert"
  on public.goat_votes for insert
  to anon, authenticated
  with check (true);

drop policy if exists "goat_votes_update" on public.goat_votes;
create policy "goat_votes_update"
  on public.goat_votes for update
  to anon, authenticated
  using (true)
  with check (true);
