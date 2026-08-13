-- 28: Fix infinite recursion on dm_members RLS
-- Run in Supabase SQL Editor after 27-social-polish.sql
-- Cause: dm_members SELECT policy queried dm_members itself → recursion

CREATE OR REPLACE FUNCTION public.my_dm_conversation_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT conversation_id FROM public.dm_members WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.my_dm_conversation_ids() TO authenticated;

DROP POLICY IF EXISTS "dm_members_select" ON public.dm_members;
CREATE POLICY "dm_members_select" ON public.dm_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR conversation_id IN (SELECT public.my_dm_conversation_ids())
  );

DROP POLICY IF EXISTS "dm_members_insert" ON public.dm_members;
CREATE POLICY "dm_members_insert" ON public.dm_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR conversation_id IN (SELECT public.my_dm_conversation_ids())
  );

DROP POLICY IF EXISTS "dm_members_update" ON public.dm_members;
CREATE POLICY "dm_members_update" ON public.dm_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "dm_conv_select" ON public.dm_conversations;
CREATE POLICY "dm_conv_select" ON public.dm_conversations
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.my_dm_conversation_ids()));

DROP POLICY IF EXISTS "dm_conv_update" ON public.dm_conversations;
CREATE POLICY "dm_conv_update" ON public.dm_conversations
  FOR UPDATE TO authenticated
  USING (id IN (SELECT public.my_dm_conversation_ids()));

DROP POLICY IF EXISTS "dm_msg_select" ON public.dm_messages;
CREATE POLICY "dm_msg_select" ON public.dm_messages
  FOR SELECT TO authenticated
  USING (conversation_id IN (SELECT public.my_dm_conversation_ids()));

DROP POLICY IF EXISTS "dm_msg_insert" ON public.dm_messages;
CREATE POLICY "dm_msg_insert" ON public.dm_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (SELECT public.my_dm_conversation_ids())
  );

DROP POLICY IF EXISTS "dm_msg_update" ON public.dm_messages;
CREATE POLICY "dm_msg_update" ON public.dm_messages
  FOR UPDATE TO authenticated
  USING (conversation_id IN (SELECT public.my_dm_conversation_ids()));

CREATE OR REPLACE FUNCTION public.get_or_create_dm(other_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  conv uuid;
  mutual boolean;
  i_follow boolean;
  they_follow boolean;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF other_user IS NULL OR other_user = me THEN RAISE EXCEPTION 'invalid peer'; END IF;

  SELECT m1.conversation_id INTO conv
  FROM dm_members m1
  JOIN dm_members m2 ON m1.conversation_id = m2.conversation_id
  WHERE m1.user_id = me AND m2.user_id = other_user
  LIMIT 1;

  IF conv IS NOT NULL THEN
    RETURN conv;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM user_follows WHERE follower_id = me AND following_id = other_user
  ) INTO i_follow;
  SELECT EXISTS (
    SELECT 1 FROM user_follows WHERE follower_id = other_user AND following_id = me
  ) INTO they_follow;
  mutual := i_follow AND they_follow;

  INSERT INTO dm_conversations (status, initiated_by)
  VALUES (CASE WHEN mutual THEN 'active' ELSE 'request' END, me)
  RETURNING id INTO conv;

  INSERT INTO dm_members (conversation_id, user_id) VALUES (conv, me), (conv, other_user);

  IF NOT mutual THEN
    PERFORM public.create_notification(
      other_user,
      'New message request',
      'Someone wants to message you',
      'message_request',
      '/messages?c=' || conv::text,
      me,
      jsonb_build_object('conversation_id', conv)
    );
  END IF;

  RETURN conv;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_dm(uuid) TO authenticated;
