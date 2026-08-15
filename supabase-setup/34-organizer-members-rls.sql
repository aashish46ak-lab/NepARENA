-- Organizer team (owner/admin/moderator) — RLS-safe manage via SECURITY DEFINER RPCs
-- Fixes: "new row violates the row level security policy for table organizer_members"
-- Run in Supabase SQL Editor

-- Ensure public can read team for About / o.$slug pages
DROP POLICY IF EXISTS "Public read organizer members" ON public.organizer_members;
CREATE POLICY "Public read organizer members"
  ON public.organizer_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users read own organizer membership" ON public.organizer_members;
CREATE POLICY "Users read own organizer membership"
  ON public.organizer_members FOR SELECT
  USING (auth.uid() = user_id);

-- Helper: is caller owner or admin of this organizer?
CREATE OR REPLACE FUNCTION public.is_organizer_admin(p_organizer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizer_members m
    WHERE m.organizer_id = p_organizer_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.id = p_organizer_id
      AND o.owner_user_id = auth.uid()
  );
$$;

-- Add or upsert team member
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
  IF p_role IS NULL OR p_role NOT IN ('owner', 'admin', 'moderator') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  IF NOT public.is_organizer_admin(p_organizer_id) THEN
    -- Allow first owner bootstrap when organizer has no members yet
    IF NOT EXISTS (
      SELECT 1 FROM public.organizer_members WHERE organizer_id = p_organizer_id
    ) AND EXISTS (
      SELECT 1 FROM public.organizers WHERE id = p_organizer_id AND owner_user_id = uid
    ) THEN
      NULL; -- ok
    ELSE
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

-- Update role only
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
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_role NOT IN ('owner', 'admin', 'moderator') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  IF NOT public.is_organizer_admin(p_organizer_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.organizer_members
  SET role = p_role
  WHERE organizer_id = p_organizer_id AND user_id = p_user_id;

  IF NOT FOUND THEN RETURN false; END IF;

  IF p_role = 'owner' THEN
    UPDATE public.organizers SET owner_user_id = p_user_id WHERE id = p_organizer_id;
  END IF;

  RETURN true;
END;
$$;

-- Remove member (cannot remove last owner)
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
