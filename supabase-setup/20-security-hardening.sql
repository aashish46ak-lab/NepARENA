-- =====================================================================
-- NepARENA Security Hardening (run in Supabase SQL Editor)
-- Stack: TanStack Start + Supabase Auth + RLS
-- Does NOT drop existing data. Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- =====================================================================

-- 1) Theme column (fixes theme save errors)
ALTER TABLE public.organizers
  ADD COLUMN IF NOT EXISTS theme_id text DEFAULT 'black-silver';

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS theme_id text DEFAULT 'black-silver';

-- 2) Audit log (privileged actions)
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  meta jsonb DEFAULT '{}'::jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_audit_log_created_idx
  ON public.security_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS security_audit_log_actor_idx
  ON public.security_audit_log (actor_id);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_admin" ON public.security_audit_log;
-- Only service role / security definer functions should insert;
-- authenticated users cannot read audit unless they are platform owners via email claim is not available in RLS easily.
-- Keep audit readable only via service role (no public SELECT policy).

DROP POLICY IF EXISTS "audit_no_client_write" ON public.security_audit_log;
-- No INSERT/UPDATE/DELETE policies for anon/authenticated → clients cannot write.

-- 3) Helper: is platform super admin (email allow-list)
CREATE OR REPLACE FUNCTION public.is_platform_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) IN (
    'aashish46ak@gmail.com',
    'baralk851@gmail.com'
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_super_admin() TO authenticated;

-- 4) Helper: has global role
CREATE OR REPLACE FUNCTION public.has_app_role(r text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = r
  ) OR public.is_platform_super_admin();
$$;

REVOKE ALL ON FUNCTION public.has_app_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_app_role(text) TO authenticated;

-- 5) SECURE FOLLOW / UNFOLLOW (auth.uid must match; no client spoof)
CREATE OR REPLACE FUNCTION public.secure_follow_organizer(p_organizer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.id = p_organizer_id AND o.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Organizer not available';
  END IF;

  INSERT INTO public.organizer_followers (organizer_id, user_id)
  VALUES (p_organizer_id, auth.uid())
  ON CONFLICT (organizer_id, user_id) DO NOTHING;

  INSERT INTO public.security_audit_log (actor_id, action, target_type, target_id)
  VALUES (auth.uid(), 'follow_organizer', 'organizer', p_organizer_id::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_unfollow_organizer(p_organizer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM public.organizer_followers
  WHERE organizer_id = p_organizer_id AND user_id = auth.uid();

  INSERT INTO public.security_audit_log (actor_id, action, target_type, target_id)
  VALUES (auth.uid(), 'unfollow_organizer', 'organizer', p_organizer_id::text);
END;
$$;

REVOKE ALL ON FUNCTION public.secure_follow_organizer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.secure_unfollow_organizer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.secure_follow_organizer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secure_unfollow_organizer(uuid) TO authenticated;

-- 6) RLS on organizer_followers
ALTER TABLE public.organizer_followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "followers_select_public_count" ON public.organizer_followers;
CREATE POLICY "followers_select_public_count" ON public.organizer_followers
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "followers_insert_self" ON public.organizer_followers;
CREATE POLICY "followers_insert_self" ON public.organizer_followers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "followers_delete_self" ON public.organizer_followers;
CREATE POLICY "followers_delete_self" ON public.organizer_followers
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Block UPDATE (no need to change rows)
DROP POLICY IF EXISTS "followers_no_update" ON public.organizer_followers;
-- no update policy = updates denied

-- 7) Auto-verification for organizers
CREATE OR REPLACE FUNCTION public.evaluate_organizer_verification(p_organizer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.organizers%ROWTYPE;
  completed int;
  ok boolean;
BEGIN
  SELECT * INTO o FROM public.organizers WHERE id = p_organizer_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO completed
  FROM public.tournaments t
  WHERE t.organizer_id = p_organizer_id
    AND t.status = 'completed';

  ok :=
    o.status = 'active'
    AND coalesce(o.logo_url, '') <> ''
    AND coalesce(o.banner_url, '') <> ''
    AND coalesce(o.contact_email, '') <> ''
    AND completed >= 1;

  -- Super admins can keep manual override; only auto-set when criteria met
  IF ok AND o.is_verified IS DISTINCT FROM true THEN
    UPDATE public.organizers
    SET is_verified = true, updated_at = now()
    WHERE id = p_organizer_id;
  END IF;

  RETURN ok;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_organizer_verification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_organizer_verification(uuid) TO authenticated;

-- 8) Harden user_roles: only super admin can change roles via RPC
CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_role NOT IN ('owner', 'admin', 'moderator', 'member') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.security_audit_log (actor_id, action, target_type, target_id, meta)
  VALUES (auth.uid(), 'set_user_role', 'user', p_user_id::text, jsonb_build_object('role', p_role));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) TO authenticated;

-- 9) Profiles: users can only update themselves; role columns must not be client-writable
-- (Assumes is_suspended is admin-only via separate RPC if needed)

-- 10) Organizer status changes: prefer RPC for audit
CREATE OR REPLACE FUNCTION public.admin_set_organizer_status(p_organizer_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_status NOT IN ('pending', 'active', 'suspended', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE public.organizers
  SET status = p_status, updated_at = now()
  WHERE id = p_organizer_id;

  INSERT INTO public.security_audit_log (actor_id, action, target_type, target_id, meta)
  VALUES (auth.uid(), 'set_organizer_status', 'organizer', p_organizer_id::text,
          jsonb_build_object('status', p_status));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_organizer_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_organizer_status(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_organizer_verified(p_organizer_id uuid, p_verified boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.organizers
  SET is_verified = p_verified, updated_at = now()
  WHERE id = p_organizer_id;

  INSERT INTO public.security_audit_log (actor_id, action, target_type, target_id, meta)
  VALUES (auth.uid(), 'set_organizer_verified', 'organizer', p_organizer_id::text,
          jsonb_build_object('verified', p_verified));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_organizer_verified(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_organizer_verified(uuid, boolean) TO authenticated;

-- Done.
NOTICE 'NepARENA 20-security-hardening applied';
