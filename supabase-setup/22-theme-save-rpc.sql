-- =====================================================================
-- 22-theme-save-rpc.sql
-- Secure theme save for default organizer + ensure row exists
-- Run AFTER 20-security-hardening.sql and 21-organizer-requests.sql
-- =====================================================================

ALTER TABLE public.organizers
  ADD COLUMN IF NOT EXISTS theme_id text DEFAULT 'black-silver';

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS theme_id text DEFAULT 'black-silver';

-- Ensure default organizer exists
INSERT INTO public.organizers (slug, name, status, is_verified, contact_email, theme_id)
SELECT
  'efootball-nepal',
  'eFootball Nepal',
  'active',
  true,
  'aashish46ak@gmail.com',
  'black-silver'
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizers WHERE slug = 'efootball-nepal'
);

-- Super-admin only theme save (bypasses restrictive RLS)
CREATE OR REPLACE FUNCTION public.admin_save_organizer_theme(
  p_slug text,
  p_name text,
  p_tagline text,
  p_description text,
  p_logo_url text,
  p_banner_url text,
  p_theme_id text,
  p_primary_color text,
  p_secondary_color text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_platform_super_admin() THEN
    -- Also allow organizer owners/admins of that slug
    IF NOT EXISTS (
      SELECT 1
      FROM public.organizers o
      JOIN public.organizer_members m ON m.organizer_id = o.id
      WHERE o.slug = p_slug
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    ) THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  UPDATE public.organizers
  SET
    name = coalesce(nullif(trim(p_name), ''), name),
    tagline = p_tagline,
    description = p_description,
    logo_url = p_logo_url,
    banner_url = p_banner_url,
    theme_id = coalesce(p_theme_id, theme_id),
    primary_color = p_primary_color,
    secondary_color = p_secondary_color,
    updated_at = now()
  WHERE slug = p_slug
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    INSERT INTO public.organizers (
      slug, name, tagline, description, logo_url, banner_url,
      theme_id, primary_color, secondary_color, status, is_verified, contact_email
    ) VALUES (
      p_slug,
      coalesce(nullif(trim(p_name), ''), p_slug),
      p_tagline,
      p_description,
      p_logo_url,
      p_banner_url,
      coalesce(p_theme_id, 'black-silver'),
      p_primary_color,
      p_secondary_color,
      'active',
      true,
      'aashish46ak@gmail.com'
    )
    RETURNING id INTO v_id;
  END IF;

  INSERT INTO public.security_audit_log (actor_id, action, target_type, target_id, meta)
  VALUES (
    auth.uid(),
    'save_organizer_theme',
    'organizer',
    v_id::text,
    jsonb_build_object('slug', p_slug, 'theme_id', p_theme_id)
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_organizer_theme(
  text, text, text, text, text, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_organizer_theme(
  text, text, text, text, text, text, text, text, text
) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '22-theme-save-rpc applied';
END $$;
