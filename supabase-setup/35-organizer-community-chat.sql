-- Organizer community group chat (Messenger-style)
-- Users request join from public organizer page → admin approves in dashboard
-- After approve, conversation appears in user's Messages with organizer name

ALTER TABLE public.dm_conversations
  ADD COLUMN IF NOT EXISTS organizer_id uuid REFERENCES public.organizers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_org_community boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS dm_conv_one_org_community
  ON public.dm_conversations (organizer_id)
  WHERE is_org_community = true AND organizer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.organizer_chat_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (organizer_id, user_id)
);

CREATE INDEX IF NOT EXISTS org_chat_req_org_status_idx
  ON public.organizer_chat_requests (organizer_id, status);

ALTER TABLE public.organizer_chat_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_chat_req_select" ON public.organizer_chat_requests;
CREATE POLICY "org_chat_req_select" ON public.organizer_chat_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organizer_members m
      WHERE m.organizer_id = organizer_chat_requests.organizer_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "org_chat_req_insert" ON public.organizer_chat_requests;
CREATE POLICY "org_chat_req_insert" ON public.organizer_chat_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Get or create the single community group for an organizer (admin only for create)
CREATE OR REPLACE FUNCTION public.get_or_create_org_community_chat(p_organizer_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  conv_id uuid;
  org_name text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id INTO conv_id
  FROM public.dm_conversations
  WHERE organizer_id = p_organizer_id AND is_org_community = true
  LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  -- Only owner/admin can create the community room
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.organizer_members
      WHERE organizer_id = p_organizer_id AND user_id = uid AND role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.organizers WHERE id = p_organizer_id AND owner_user_id = uid
    )
  ) THEN
    RAISE EXCEPTION 'Only organizer admin can create community chat';
  END IF;

  SELECT name INTO org_name FROM public.organizers WHERE id = p_organizer_id;

  INSERT INTO public.dm_conversations (status, is_group, is_org_community, organizer_id, title, created_by, initiated_by)
  VALUES ('active', true, true, p_organizer_id, COALESCE(org_name, 'Community'), uid, uid)
  RETURNING id INTO conv_id;

  -- Add all current team members
  INSERT INTO public.dm_members (conversation_id, user_id, last_read_at)
  SELECT conv_id, m.user_id, now()
  FROM public.organizer_members m
  WHERE m.organizer_id = p_organizer_id
  ON CONFLICT DO NOTHING;

  -- Ensure creator is in
  INSERT INTO public.dm_members (conversation_id, user_id, last_read_at)
  VALUES (conv_id, uid, now())
  ON CONFLICT DO NOTHING;

  RETURN conv_id;
END;
$$;

-- User requests to join community chat
CREATE OR REPLACE FUNCTION public.request_org_community_chat(
  p_organizer_id uuid,
  p_message text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  conv_id uuid;
  existing_status text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Already a member of the community chat?
  SELECT c.id INTO conv_id
  FROM public.dm_conversations c
  JOIN public.dm_members m ON m.conversation_id = c.id AND m.user_id = uid
  WHERE c.organizer_id = p_organizer_id AND c.is_org_community = true
  LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN 'already_member:' || conv_id::text;
  END IF;

  SELECT status INTO existing_status
  FROM public.organizer_chat_requests
  WHERE organizer_id = p_organizer_id AND user_id = uid;

  IF existing_status = 'pending' THEN
    RETURN 'pending';
  END IF;

  IF existing_status = 'approved' THEN
    -- Re-add if somehow missing
    SELECT id INTO conv_id FROM public.dm_conversations
    WHERE organizer_id = p_organizer_id AND is_org_community = true LIMIT 1;
    IF conv_id IS NOT NULL THEN
      INSERT INTO public.dm_members (conversation_id, user_id, last_read_at)
      VALUES (conv_id, uid, null) ON CONFLICT DO NOTHING;
      RETURN 'already_member:' || conv_id::text;
    END IF;
  END IF;

  INSERT INTO public.organizer_chat_requests (organizer_id, user_id, status, message)
  VALUES (p_organizer_id, uid, 'pending', NULLIF(trim(p_message), ''))
  ON CONFLICT (organizer_id, user_id)
  DO UPDATE SET status = 'pending', message = EXCLUDED.message, resolved_at = NULL, resolved_by = NULL, created_at = now();

  RETURN 'requested';
END;
$$;

-- Admin approves → adds user to community group
CREATE OR REPLACE FUNCTION public.approve_org_community_chat(
  p_request_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  req RECORD;
  conv_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO req FROM public.organizer_chat_requests WHERE id = p_request_id;
  IF req IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'Request is not pending'; END IF;

  IF NOT (
    EXISTS (
      SELECT 1 FROM public.organizer_members
      WHERE organizer_id = req.organizer_id AND user_id = uid AND role IN ('owner', 'admin', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM public.organizers WHERE id = req.organizer_id AND owner_user_id = uid
    )
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  conv_id := public.get_or_create_org_community_chat(req.organizer_id);

  INSERT INTO public.dm_members (conversation_id, user_id, last_read_at)
  VALUES (conv_id, req.user_id, null)
  ON CONFLICT DO NOTHING;

  UPDATE public.organizer_chat_requests
  SET status = 'approved', resolved_at = now(), resolved_by = uid
  WHERE id = p_request_id;

  RETURN conv_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_org_community_chat(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  req RECORD;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO req FROM public.organizer_chat_requests WHERE id = p_request_id;
  IF req IS NULL THEN RETURN false; END IF;

  IF NOT (
    EXISTS (
      SELECT 1 FROM public.organizer_members
      WHERE organizer_id = req.organizer_id AND user_id = uid AND role IN ('owner', 'admin', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM public.organizers WHERE id = req.organizer_id AND owner_user_id = uid
    )
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.organizer_chat_requests
  SET status = 'declined', resolved_at = now(), resolved_by = uid
  WHERE id = p_request_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_org_community_chat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_org_community_chat(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_org_community_chat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_org_community_chat(uuid) TO authenticated;
