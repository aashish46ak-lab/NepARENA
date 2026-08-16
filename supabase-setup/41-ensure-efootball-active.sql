-- Ensure eFootball Nepal is publicly visible with logo from site_settings
UPDATE public.organizers
SET status = 'active',
    logo_url = COALESCE(
      logo_url,
      (SELECT logo_url FROM public.site_settings LIMIT 1)
    ),
    cover_url = COALESCE(
      cover_url,
      (SELECT hero_image_url FROM public.site_settings LIMIT 1)
    )
WHERE slug = 'efootball-nepal' OR name ILIKE '%efootball%nepal%';

-- Any approved org stuck on pending → active
UPDATE public.organizers SET status = 'active'
WHERE status = 'pending' AND is_verified = true;
