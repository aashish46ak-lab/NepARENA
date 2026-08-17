-- Allow platform admins to create/update organizers on approve.
-- Schema columns: owner_user_id, banner_url (NOT owner_id / cover_url).

DROP POLICY IF EXISTS "Admins manage organizers" ON public.organizers;
CREATE POLICY "Admins manage organizers"
  ON public.organizers
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage organizer members" ON public.organizer_members;
CREATE POLICY "Admins manage organizer members"
  ON public.organizer_members
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.approve_organizer_request(p_request_id uuid, p_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.organizer_requests%ROWTYPE;
  oid uuid;
  s text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO r FROM public.organizer_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request not found';
  END IF;

  s := coalesce(nullif(trim(p_slug), ''), lower(regexp_replace(r.org_name, '[^a-zA-Z0-9]+', '-', 'g')));
  s := trim(both '-' from s);
  IF s = '' THEN s := 'organizer'; END IF;

  INSERT INTO public.organizers (
    name, slug, logo_url, banner_url, description,
    status, is_verified, owner_user_id
  ) VALUES (
    r.org_name, s, r.logo_url, r.banner_url, r.description,
    'active', true, r.user_id
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    logo_url = COALESCE(EXCLUDED.logo_url, public.organizers.logo_url),
    banner_url = COALESCE(EXCLUDED.banner_url, public.organizers.banner_url),
    description = COALESCE(EXCLUDED.description, public.organizers.description),
    status = 'active',
    is_verified = true,
    owner_user_id = COALESCE(EXCLUDED.owner_user_id, public.organizers.owner_user_id)
  RETURNING id INTO oid;

  IF r.user_id IS NOT NULL THEN
    INSERT INTO public.organizer_members (organizer_id, user_id, role)
    VALUES (oid, r.user_id, 'owner')
    ON CONFLICT (organizer_id, user_id) DO UPDATE SET role = 'owner';
  END IF;

  UPDATE public.organizer_requests
  SET status = 'approved', updated_at = now()
  WHERE id = p_request_id;

  RETURN oid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_organizer_request(uuid, text) TO authenticated;
