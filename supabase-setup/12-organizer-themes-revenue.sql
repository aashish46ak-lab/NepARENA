-- NepARENA: organizer themes + follow link + revenue helpers
-- Run in Supabase SQL editor (safe / idempotent)

ALTER TABLE public.organizers
  ADD COLUMN IF NOT EXISTS theme_id text DEFAULT 'black-silver',
  ADD COLUMN IF NOT EXISTS follow_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS og_image_url text;

-- Unique follow codes for existing organizers
UPDATE public.organizers
SET follow_code = lower(substr(md5(id::text || slug), 1, 10))
WHERE follow_code IS NULL;

-- Ensure eFootball Nepal is org #1 active
INSERT INTO public.organizers (slug, name, tagline, description, status, is_verified, contact_email, theme_id)
VALUES (
  'efootball-nepal',
  'eFootball Nepal',
  'The official home of competitive eFootball in Nepal',
  'Tournaments, community, hall of fame, and esports updates for Nepal.',
  'active',
  true,
  'aashish46ak@gmail.com',
  'black-silver'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'active',
  is_verified = true,
  updated_at = now();

UPDATE public.tournaments t
SET organizer_id = o.id
FROM public.organizers o
WHERE o.slug = 'efootball-nepal'
  AND t.organizer_id IS NULL;

-- registration_fee already on tournaments; revenue = participants_count * registration_fee (app-side)
