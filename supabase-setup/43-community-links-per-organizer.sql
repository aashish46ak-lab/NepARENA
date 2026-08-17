-- Per-organizer community links (not global across organizers)
alter table public.community_links
  add column if not exists organizer_id uuid references public.organizers(id) on delete cascade;

create index if not exists community_links_organizer_idx
  on public.community_links (organizer_id);

-- Legacy rows with organizer_id IS NULL stay platform-only (footer),
-- and will NOT show on individual organizer public pages.
