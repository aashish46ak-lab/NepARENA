-- Grant eFootball Nepal organizer ownership to platform super admins.
-- Run AFTER 11-neparena-organizers.sql
-- Replace emails if needed.

-- Ensure organizer exists
INSERT INTO public.organizers (slug, name, tagline, status, is_verified, contact_email)
VALUES (
  'efootball-nepal',
  'eFootball Nepal',
  'The official home of competitive eFootball in Nepal',
  'active',
  true,
  'aashish46ak@gmail.com'
)
ON CONFLICT (slug) DO UPDATE SET
  status = 'active',
  is_verified = true,
  updated_at = now();

-- Link profiles by email (auth.users → profiles id usually matches)
-- Super admins as organizer owners
INSERT INTO public.organizer_members (organizer_id, user_id, role)
SELECT o.id, u.id, 'owner'
FROM public.organizers o
CROSS JOIN auth.users u
WHERE o.slug = 'efootball-nepal'
  AND lower(u.email) IN (
    'aashish46ak@gmail.com',
    'baralk851@gmail.com'
  )
ON CONFLICT (organizer_id, user_id) DO UPDATE SET role = 'owner';

UPDATE public.organizers o
SET owner_user_id = u.id
FROM auth.users u
WHERE o.slug = 'efootball-nepal'
  AND lower(u.email) = 'aashish46ak@gmail.com';

-- Attach legacy tournaments to eFootball Nepal
UPDATE public.tournaments t
SET organizer_id = o.id
FROM public.organizers o
WHERE o.slug = 'efootball-nepal'
  AND t.organizer_id IS NULL;
