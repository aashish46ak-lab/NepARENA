-- Group chats (3+ members), message edit / soft-delete
-- Run manually in Supabase SQL editor

ALTER TABLE public.dm_conversations
  ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.dm_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE OR REPLACE FUNCTION public.soft_delete_dm_message(p_message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  UPDATE public.dm_messages
  SET body = NULL,
      image_url = NULL,
      deleted_at = now(),
      reaction = NULL
  WHERE id = p_message_id
    AND sender_id = uid
    AND deleted_at IS NULL;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.edit_dm_message(p_message_id uuid, p_body text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN RETURN false; END IF;
  UPDATE public.dm_messages
  SET body = trim(p_body),
      edited_at = now()
  WHERE id = p_message_id
    AND sender_id = uid
    AND deleted_at IS NULL;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_dm_group(p_title text, p_member_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  conv_id uuid;
  mid uuid;
  members uuid[];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT array_agg(DISTINCT x) INTO members
  FROM unnest(p_member_ids) AS x
  WHERE x IS NOT NULL AND x <> uid;
  IF members IS NULL OR array_length(members, 1) < 2 THEN
    RAISE EXCEPTION 'Group needs at least 2 other members (3 total)';
  END IF;

  INSERT INTO public.dm_conversations (status, is_group, title, created_by, initiated_by)
  VALUES ('active', true, COALESCE(NULLIF(trim(p_title), ''), 'Group chat'), uid, uid)
  RETURNING id INTO conv_id;

  INSERT INTO public.dm_members (conversation_id, user_id, last_read_at)
  VALUES (conv_id, uid, now());

  FOREACH mid IN ARRAY members LOOP
    INSERT INTO public.dm_members (conversation_id, user_id, last_read_at)
    VALUES (conv_id, mid, null)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_dm_message(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.edit_dm_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_dm_group(text, uuid[]) TO authenticated;

DROP POLICY IF EXISTS "dm_msg_delete_own" ON public.dm_messages;
CREATE POLICY "dm_msg_delete_own" ON public.dm_messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid());
