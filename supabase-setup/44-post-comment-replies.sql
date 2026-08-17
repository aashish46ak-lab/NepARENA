-- Nested replies on post comments
alter table public.post_comments
  add column if not exists parent_id uuid references public.post_comments(id) on delete cascade;

create index if not exists post_comments_parent_idx on public.post_comments (parent_id);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);
