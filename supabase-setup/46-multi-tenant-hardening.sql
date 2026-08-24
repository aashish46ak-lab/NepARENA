-- ============================================================
-- 46 — Multi-tenant hardening (idempotent, non-destructive)
-- Run in Supabase SQL Editor AFTER prior migrations.
-- Goals:
--  • Backfill tournaments.organizer_id → eFootball Nepal when NULL
--  • Scope tournament / match / participant writes to org staff
--  • Allow organizer owners/admins to update their own organizer row
--  • Platform super-admin retains global access
--  • Do NOT drop eFootball Nepal or existing data
-- ============================================================

-- 1) Helpers -------------------------------------------------
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

CREATE OR REPLACE FUNCTION public.is_organizer_admin(p_organizer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND p_organizer_id IS NOT NULL
    AND (
      public.is_platform_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.organizers o
        WHERE o.id = p_organizer_id AND o.owner_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.organizer_members m
        WHERE m.organizer_id = p_organizer_id
          AND m.user_id = auth.uid()
          AND m.role IN ('owner', 'admin')
      )
    );
$$;

-- Owner / admin / moderator (tournament ops)
CREATE OR REPLACE FUNCTION public.is_organizer_staff(p_organizer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND p_organizer_id IS NOT NULL
    AND (
      public.is_platform_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.organizers o
        WHERE o.id = p_organizer_id AND o.owner_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.organizer_members m
        WHERE m.organizer_id = p_organizer_id
          AND m.user_id = auth.uid()
          AND m.role IN ('owner', 'admin', 'moderator')
      )
    );
$$;

-- Resolve tournament → organizer for RLS
CREATE OR REPLACE FUNCTION public.tournament_organizer_id(p_tournament_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organizer_id FROM public.tournaments WHERE id = p_tournament_id;
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organizer_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organizer_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tournament_organizer_id(uuid) TO authenticated;

-- 2) Backfill legacy tournaments → eFootball Nepal ----------
UPDATE public.tournaments t
SET organizer_id = o.id
FROM public.organizers o
WHERE t.organizer_id IS NULL
  AND o.slug = 'efootball-nepal';

CREATE INDEX IF NOT EXISTS tournaments_organizer_idx
  ON public.tournaments (organizer_id);

-- Optional history column (safe add)
ALTER TABLE public.tournament_history
  ADD COLUMN IF NOT EXISTS organizer_id uuid REFERENCES public.organizers(id) ON DELETE SET NULL;

UPDATE public.tournament_history h
SET organizer_id = t.organizer_id
FROM public.tournaments t
WHERE h.source_tournament_id = t.id
  AND h.organizer_id IS NULL
  AND t.organizer_id IS NOT NULL;

UPDATE public.tournament_history h
SET organizer_id = o.id
FROM public.organizers o
WHERE h.organizer_id IS NULL
  AND o.slug = 'efootball-nepal';

CREATE INDEX IF NOT EXISTS tournament_history_organizer_idx
  ON public.tournament_history (organizer_id);

-- 3) Organizers write policies (owner/admin of THAT org) ----
DROP POLICY IF EXISTS "Admins manage organizers" ON public.organizers;
DROP POLICY IF EXISTS "org_update_own" ON public.organizers;
DROP POLICY IF EXISTS "org_select_staff" ON public.organizers;

-- Keep public read of active; staff can read their own even if pending
DROP POLICY IF EXISTS "Public can read active organizers" ON public.organizers;
CREATE POLICY "Public can read active organizers"
  ON public.organizers FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    OR public.is_platform_super_admin()
    OR owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organizer_members m
      WHERE m.organizer_id = id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "org_update_own"
  ON public.organizers FOR UPDATE
  TO authenticated
  USING (public.is_organizer_admin(id))
  WITH CHECK (public.is_organizer_admin(id));

-- Super-admin insert/delete only via RPC preferred; allow platform super admin
DROP POLICY IF EXISTS "org_insert_super" ON public.organizers;
CREATE POLICY "org_insert_super"
  ON public.organizers FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_super_admin() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "org_delete_super" ON public.organizers;
CREATE POLICY "org_delete_super"
  ON public.organizers FOR DELETE
  TO authenticated
  USING (public.is_platform_super_admin());

-- 4) Tournaments RLS — org staff, not global is_admin -------
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tournaments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tournaments', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "tournaments_select_public"
  ON public.tournaments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "tournaments_insert_staff"
  ON public.tournaments FOR INSERT
  TO authenticated
  WITH CHECK (
    organizer_id IS NOT NULL
    AND public.is_organizer_staff(organizer_id)
  );

CREATE POLICY "tournaments_update_staff"
  ON public.tournaments FOR UPDATE
  TO authenticated
  USING (
    organizer_id IS NOT NULL
    AND public.is_organizer_staff(organizer_id)
  )
  WITH CHECK (
    organizer_id IS NOT NULL
    AND public.is_organizer_staff(organizer_id)
  );

CREATE POLICY "tournaments_delete_staff"
  ON public.tournaments FOR DELETE
  TO authenticated
  USING (
    organizer_id IS NOT NULL
    AND public.is_organizer_admin(organizer_id)
  );

-- 5) Participants -------------------------------------------
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tournament_participants'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tournament_participants', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "participants_select"
  ON public.tournament_participants FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "participants_self_insert"
  ON public.tournament_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_organizer_staff(public.tournament_organizer_id(tournament_id))
  );

CREATE POLICY "participants_staff_update"
  ON public.tournament_participants FOR UPDATE
  TO authenticated
  USING (public.is_organizer_staff(public.tournament_organizer_id(tournament_id)))
  WITH CHECK (public.is_organizer_staff(public.tournament_organizer_id(tournament_id)));

CREATE POLICY "participants_delete"
  ON public.tournament_participants FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_organizer_staff(public.tournament_organizer_id(tournament_id))
  );

-- 6) Matches ------------------------------------------------
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'matches'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.matches', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "matches_select"
  ON public.matches FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "matches_staff_insert"
  ON public.matches FOR INSERT
  TO authenticated
  WITH CHECK (public.is_organizer_staff(public.tournament_organizer_id(tournament_id)));

CREATE POLICY "matches_staff_update"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (public.is_organizer_staff(public.tournament_organizer_id(tournament_id)))
  WITH CHECK (public.is_organizer_staff(public.tournament_organizer_id(tournament_id)));

CREATE POLICY "matches_staff_delete"
  ON public.matches FOR DELETE
  TO authenticated
  USING (public.is_organizer_staff(public.tournament_organizer_id(tournament_id)));

-- 7) Tournament history -------------------------------------
ALTER TABLE public.tournament_history ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tournament_history'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tournament_history', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "th_select"
  ON public.tournament_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "th_staff_write"
  ON public.tournament_history FOR INSERT
  TO authenticated
  WITH CHECK (
    organizer_id IS NOT NULL AND public.is_organizer_staff(organizer_id)
    OR public.is_platform_super_admin()
  );

CREATE POLICY "th_staff_update"
  ON public.tournament_history FOR UPDATE
  TO authenticated
  USING (
    (organizer_id IS NOT NULL AND public.is_organizer_staff(organizer_id))
    OR public.is_platform_super_admin()
  )
  WITH CHECK (
    (organizer_id IS NOT NULL AND public.is_organizer_staff(organizer_id))
    OR public.is_platform_super_admin()
  );

CREATE POLICY "th_staff_delete"
  ON public.tournament_history FOR DELETE
  TO authenticated
  USING (
    (organizer_id IS NOT NULL AND public.is_organizer_admin(organizer_id))
    OR public.is_platform_super_admin()
  );

-- 8) Community links (when organizer_id set) ----------------
ALTER TABLE public.community_links ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_links'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.community_links', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "cl_select"
  ON public.community_links FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "cl_insert"
  ON public.community_links FOR INSERT
  TO authenticated
  WITH CHECK (
    (organizer_id IS NOT NULL AND public.is_organizer_admin(organizer_id))
    OR (organizer_id IS NULL AND (public.is_platform_super_admin() OR public.is_admin(auth.uid())))
  );

CREATE POLICY "cl_update"
  ON public.community_links FOR UPDATE
  TO authenticated
  USING (
    (organizer_id IS NOT NULL AND public.is_organizer_admin(organizer_id))
    OR (organizer_id IS NULL AND (public.is_platform_super_admin() OR public.is_admin(auth.uid())))
  )
  WITH CHECK (
    (organizer_id IS NOT NULL AND public.is_organizer_admin(organizer_id))
    OR (organizer_id IS NULL AND (public.is_platform_super_admin() OR public.is_admin(auth.uid())))
  );

CREATE POLICY "cl_delete"
  ON public.community_links FOR DELETE
  TO authenticated
  USING (
    (organizer_id IS NOT NULL AND public.is_organizer_admin(organizer_id))
    OR (organizer_id IS NULL AND (public.is_platform_super_admin() OR public.is_admin(auth.uid())))
  );

-- 9) Approve organizer — super admin OR platform is_admin ---
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
  IF NOT (public.is_platform_super_admin() OR public.is_admin(auth.uid())) THEN
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

-- 10) Theme save RPC — accept any slug the caller may manage
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
  oid uuid;
  s text := coalesce(nullif(trim(p_slug), ''), 'efootball-nepal');
BEGIN
  SELECT id INTO oid FROM public.organizers WHERE slug = s LIMIT 1;
  IF oid IS NULL THEN
    RAISE EXCEPTION 'organizer not found';
  END IF;
  IF NOT public.is_organizer_admin(oid) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.organizers SET
    name = coalesce(nullif(trim(p_name), ''), name),
    description = coalesce(p_description, description),
    logo_url = coalesce(p_logo_url, logo_url),
    banner_url = coalesce(p_banner_url, banner_url),
    updated_at = now()
  WHERE id = oid;

  -- theme columns may or may not exist
  BEGIN
    EXECUTE format(
      'UPDATE public.organizers SET theme_id = $1, primary_color = $2, secondary_color = $3 WHERE id = $4'
    ) USING p_theme_id, p_primary_color, p_secondary_color, oid;
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  RETURN oid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_organizer_theme(text, text, text, text, text, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.is_organizer_staff(uuid) IS
  'True if auth.uid is owner/admin/moderator of organizer or platform super-admin';
