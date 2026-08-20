-- Optional: run in Supabase SQL editor for admin-managed News
create table if not exists public.platform_news (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  category text not null default 'General',
  author text not null default 'NepARENA',
  cover_url text,
  published_at timestamptz not null default now(),
  featured boolean not null default false,
  status text not null default 'published' check (status in ('published', 'draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_news_status_published_at
  on public.platform_news (status, published_at desc);

alter table public.platform_news enable row level security;

-- Public read of published rows
create policy if not exists "platform_news_public_read"
  on public.platform_news for select
  using (status = 'published');

-- Authenticated write (tighten to super-admin in production if desired)
create policy if not exists "platform_news_auth_write"
  on public.platform_news for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
