-- ============================================================
-- 38 — Organizer members RLS fix + local-midnight login streaks
-- Run ENTIRE file in Supabase SQL Editor (one shot)
-- Fixes:
--   • "new row violates row level security policy for table organizer_members"
--   • Role change / add member not persisting
--   • Streak stays when user skipped days (must use LOCAL calendar day)
-- ============================================================

ALTER TABLE public.organizer_members ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organizer_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizer_members', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "om_select_all"
  ON public.organizer_members FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "om_insert_admin"
  ON public.organizer_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = organizer_id AND o.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.organizer_members m
      WHERE m.organizer_id = organizer_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "om_update_admin"
  ON public.organizer_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = organizer_id AND o.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.organizer_members m
      WHERE m.organizer_id = organizer_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (true);

CREATE POLICY "om_delete_admin"
  ON public.organizer_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = organizer_id AND o.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.organizer_members m
      WHERE m.organizer_id = organizer_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

CREATE OR REPLACE FUNCTION public.is_organizer_admin(p_organizer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
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

CREATE OR REPLACE FUNCTION public.manage_organizer_member(
  p_organizer_id uuid,
  p_user_id uuid,
  p_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('owner', 'admin', 'moderator') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  IF NOT public.is_organizer_admin(p_organizer_id) THEN
    IF NOT (
      EXISTS (SELECT 1 FROM public.organizers WHERE id = p_organizer_id AND owner_user_id = uid)
      AND NOT EXISTS (SELECT 1 FROM public.organizer_members WHERE organizer_id = p_organizer_id)
    ) THEN
      RAISE EXCEPTION 'Not allowed to manage this organizer team';
    END IF;
  END IF;

  INSERT INTO public.organizer_members (organizer_id, user_id, role)
  VALUES (p_organizer_id, p_user_id, p_role)
  ON CONFLICT (organizer_id, user_id)
  DO UPDATE SET role = EXCLUDED.role;

  IF p_role = 'owner' THEN
    UPDATE public.organizers SET owner_user_id = p_user_id WHERE id = p_organizer_id;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_organizer_member_role(
  p_organizer_id uuid,
  p_user_id uuid,
  p_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.manage_organizer_member(p_organizer_id, p_user_id, p_role);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_organizer_member(
  p_organizer_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_count int;
  target_role text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_organizer_admin(p_organizer_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT role INTO target_role
  FROM public.organizer_members
  WHERE organizer_id = p_organizer_id AND user_id = p_user_id;

  IF target_role IS NULL THEN RETURN false; END IF;

  IF target_role = 'owner' THEN
    SELECT count(*) INTO owner_count
    FROM public.organizer_members
    WHERE organizer_id = p_organizer_id AND role = 'owner';
    IF owner_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the only owner';
    END IF;
  END IF;

  DELETE FROM public.organizer_members
  WHERE organizer_id = p_organizer_id AND user_id = p_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_organizer_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manage_organizer_member(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_organizer_member_role(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_organizer_member(uuid, uuid) TO authenticated;

INSERT INTO public.organizer_members (organizer_id, user_id, role)
SELECT o.id, o.owner_user_id, 'owner'
FROM public.organizers o
WHERE o.owner_user_id IS NOT NULL
ON CONFLICT (organizer_id, user_id) DO UPDATE
SET role = 'owner';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_login_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_date date;

CREATE OR REPLACE FUNCTION public.record_login_streak(p_tz text DEFAULT 'UTC')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  tz text := COALESCE(NULLIF(trim(p_tz), ''), 'UTC');
  today_local date;
  prev date;
  cur integer;
  longest integer;
  new_streak integer;
  dim_until timestamptz;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  BEGIN
    today_local := (timezone(tz, now()))::date;
  EXCEPTION WHEN OTHERS THEN
    tz := 'UTC';
    today_local := (timezone('UTC', now()))::date;
  END;

  SELECT last_login_date, login_streak, longest_login_streak
    INTO prev, cur, longest
  FROM public.profiles
  WHERE id = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_profile');
  END IF;

  IF prev IS NOT NULL AND prev = today_local THEN
    dim_until := (timezone(tz, (today_local + 1)::timestamp)) AT TIME ZONE tz;
    RETURN jsonb_build_object(
      'ok', true,
      'streak', COALESCE(cur, 0),
      'longest', COALESCE(longest, 0),
      'already_today', true,
      'local_date', today_local,
      'dim_until', dim_until
    );
  END IF;

  IF prev IS NOT NULL AND prev = (today_local - 1) THEN
    new_streak := GREATEST(COALESCE(cur, 0), 0) + 1;
  ELSE
    new_streak := 1;
  END IF;

  longest := GREATEST(COALESCE(longest, 0), new_streak);

  UPDATE public.profiles
  SET
    login_streak = new_streak,
    longest_login_streak = longest,
    last_login_date = today_local
  WHERE id = uid;

  dim_until := (timezone(tz, (today_local + 1)::timestamp)) AT TIME ZONE tz;

  RETURN jsonb_build_object(
    'ok', true,
    'streak', new_streak,
    'longest', longest,
    'already_today', false,
    'local_date', today_local,
    'dim_until', dim_until
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_login_streak()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.record_login_streak('UTC');
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_login_streak(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_streak() TO authenticated;

UPDATE public.profiles
SET login_streak = 0
WHERE last_login_date IS NOT NULL
  AND last_login_date < (timezone('UTC', now())::date - 1)
  AND login_streak > 0;
