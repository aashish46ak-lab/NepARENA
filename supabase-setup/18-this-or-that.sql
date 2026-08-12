create table if not exists public.this_or_that_votes (
  pair_id text not null,
  side text not null check (side in ('a', 'b')),
  votes int not null default 0,
  updated_at timestamptz default now(),
  primary key (pair_id, side)
);

alter table public.this_or_that_votes enable row level security;

drop policy if exists "tot_read" on public.this_or_that_votes;
create policy "tot_read" on public.this_or_that_votes
  for select to anon, authenticated using (true);

drop policy if exists "tot_insert" on public.this_or_that_votes;
create policy "tot_insert" on public.this_or_that_votes
  for insert to anon, authenticated with check (true);

drop policy if exists "tot_update" on public.this_or_that_votes;
create policy "tot_update" on public.this_or_that_votes
  for update to anon, authenticated using (true) with check (true);
