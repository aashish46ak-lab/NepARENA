-- Group member management: add / remove / rename
-- Run in Supabase SQL editor after 31-dm-groups-edit.sql

CREATE OR REPLACE FUNCTION public.add_dm_group_members(p_conversation_id uuid, p_member_ids uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  mid uuid;
  is_member boolean;
  is_grp boolean;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  SELECT is_group INTO is_grp FROM public.dm_conversations WHERE id = p_conversation_id;
  IF NOT COALESCE(is_grp, false) THEN RETURN false; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.dm_members WHERE conversation_id = p_conversation_id AND user_id = uid
  ) INTO is_member;
  IF NOT is_member THEN RETURN false; END IF;

  FOREACH mid IN ARRAY p_member_ids LOOP
    IF mid IS NOT NULL AND mid <> uid THEN
      INSERT INTO public.dm_members (conversation_id, user_id, last_read_at)
      VALUES (p_conversation_id, mid, null)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  UPDATE public.dm_conversations SET updated_at = now() WHERE id = p_conversation_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_dm_group_member(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  creator uuid;
  is_grp boolean;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  SELECT is_group, created_by INTO is_grp, creator
  FROM public.dm_conversations WHERE id = p_conversation_id;
  IF NOT COALESCE(is_grp, false) THEN RETURN false; END IF;

  -- Self leave always allowed; otherwise only creator can remove
  IF p_user_id <> uid AND creator IS DISTINCT FROM uid THEN
    RETURN false;
  END IF;

  DELETE FROM public.dm_members
  WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
  UPDATE public.dm_conversations SET updated_at = now() WHERE id = p_conversation_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_dm_group_title(p_conversation_id uuid, p_title text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_grp boolean;
  is_member boolean;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN RETURN false; END IF;
  SELECT is_group INTO is_grp FROM public.dm_conversations WHERE id = p_conversation_id;
  IF NOT COALESCE(is_grp, false) THEN RETURN false; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.dm_members WHERE conversation_id = p_conversation_id AND user_id = uid
  ) INTO is_member;
  IF NOT is_member THEN RETURN false; END IF;

  UPDATE public.dm_conversations
  SET title = trim(p_title), updated_at = now()
  WHERE id = p_conversation_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_dm_group_members(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_dm_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_dm_group_title(uuid, text) TO authenticated;
