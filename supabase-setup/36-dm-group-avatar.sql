-- Optional group avatar for DM group chats
-- Idempotent; run after 31-dm-groups-edit.sql

ALTER TABLE public.dm_conversations
  ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE OR REPLACE FUNCTION public.update_dm_group_avatar(
  p_conversation_id uuid,
  p_avatar_url text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.dm_members
    WHERE conversation_id = p_conversation_id AND user_id = uid
  ) THEN
    RETURN false;
  END IF;
  UPDATE public.dm_conversations
  SET avatar_url = NULLIF(trim(p_avatar_url), ''),
      updated_at = now()
  WHERE id = p_conversation_id AND is_group = true;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_dm_group_avatar(uuid, text) TO authenticated;
