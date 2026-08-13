-- NepARENA social polish: message requests, notes, post media/reposts, richer notifications
-- Run in Supabase SQL Editor after 26-social-dm-feed.sql

-- ── DM request state ──────────────────────────────────────────────
ALTER TABLE public.dm_conversations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
-- status: active | request | declined | blocked

ALTER TABLE public.dm_conversations
  ADD COLUMN IF NOT EXISTS initiated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── Instagram-style notes (24h ephemeral text) ────────────────────
CREATE TABLE IF NOT EXISTS public.user_notes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notes_select" ON public.user_notes;
CREATE POLICY "notes_select" ON public.user_notes
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "notes_upsert_own" ON public.user_notes;
CREATE POLICY "notes_upsert_own" ON public.user_notes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "notes_update_own" ON public.user_notes;
CREATE POLICY "notes_update_own" ON public.user_notes
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notes_delete_own" ON public.user_notes;
CREATE POLICY "notes_delete_own" ON public.user_notes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notes TO authenticated;

-- ── Posts: multi-image, edit, repost ──────────────────────────────
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS repost_of uuid REFERENCES public.posts(id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS hidden_by uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS posts_repost_of_idx ON public.posts (repost_of) WHERE repost_of IS NOT NULL;

-- ── Notifications enrichment ──────────────────────────────────────
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'info';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

-- Helper: create notification (SECURITY DEFINER so actor can notify peer)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_title text,
  p_body text DEFAULT NULL,
  p_type text DEFAULT 'info',
  p_link text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nid uuid;
BEGIN
  IF p_user_id IS NULL OR p_user_id = p_actor_id THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.notifications (user_id, title, body, type, link, actor_id, meta)
  VALUES (p_user_id, p_title, p_body, p_type, p_link, p_actor_id, COALESCE(p_meta, '{}'::jsonb))
  RETURNING id INTO nid;
  RETURN nid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, uuid, jsonb) TO authenticated;

-- Follow → notification
CREATE OR REPLACE FUNCTION public.on_user_follow_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name text;
BEGIN
  SELECT COALESCE(NULLIF(full_name, ''), NULLIF(username, ''), 'Someone')
    INTO actor_name FROM public.profiles WHERE id = NEW.follower_id;
  PERFORM public.create_notification(
    NEW.following_id,
    actor_name || ' followed you',
    'Tap to view profile',
    'follow',
    '/members/' || NEW.follower_id::text,
    NEW.follower_id,
    jsonb_build_object('follower_id', NEW.follower_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_follow_notify ON public.user_follows;
CREATE TRIGGER user_follow_notify
  AFTER INSERT ON public.user_follows
  FOR EACH ROW EXECUTE FUNCTION public.on_user_follow_notify();

-- Like → notification
CREATE OR REPLACE FUNCTION public.on_post_like_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  author uuid;
  actor_name text;
BEGIN
  SELECT author_id INTO author FROM public.posts WHERE id = NEW.post_id;
  IF author IS NULL OR author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(full_name, ''), NULLIF(username, ''), 'Someone')
    INTO actor_name FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.create_notification(
    author,
    actor_name || ' liked your post',
    NULL,
    'like',
    '/feed',
    NEW.user_id,
    jsonb_build_object('post_id', NEW.post_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS post_like_notify ON public.post_likes;
CREATE TRIGGER post_like_notify
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.on_post_like_notify();

-- Comment → notification
CREATE OR REPLACE FUNCTION public.on_post_comment_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  author uuid;
  actor_name text;
BEGIN
  SELECT author_id INTO author FROM public.posts WHERE id = NEW.post_id;
  IF author IS NULL OR author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(full_name, ''), NULLIF(username, ''), 'Someone')
    INTO actor_name FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.create_notification(
    author,
    actor_name || ' commented on your post',
    left(NEW.body, 120),
    'comment',
    '/feed',
    NEW.user_id,
    jsonb_build_object('post_id', NEW.post_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS post_comment_notify ON public.post_comments;
CREATE TRIGGER post_comment_notify
  AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.on_post_comment_notify();

-- get_or_create_dm: if not mutual follow → status=request
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

-- Accept message request
CREATE OR REPLACE FUNCTION public.accept_dm_request(conv_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  st text;
  initiator uuid;
BEGIN
  IF me IS NULL THEN RETURN false; END IF;
  SELECT status, initiated_by INTO st, initiator
  FROM dm_conversations WHERE id = conv_id;
  IF st IS NULL OR st <> 'request' THEN RETURN false; END IF;
  -- Only the recipient (not initiator) can accept
  IF initiator = me THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM dm_members WHERE conversation_id = conv_id AND user_id = me) THEN
    RETURN false;
  END IF;
  UPDATE dm_conversations SET status = 'active', updated_at = now() WHERE id = conv_id;
  IF initiator IS NOT NULL THEN
    PERFORM public.create_notification(
      initiator,
      'Message request accepted',
      'You can chat now',
      'message_accepted',
      '/messages?c=' || conv_id::text,
      me,
      '{}'::jsonb
    );
  END IF;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_dm_request(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.decline_dm_request(conv_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM dm_members WHERE conversation_id = conv_id AND user_id = me) THEN
    RETURN false;
  END IF;
  UPDATE dm_conversations SET status = 'declined', updated_at = now() WHERE id = conv_id AND status = 'request';
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decline_dm_request(uuid) TO authenticated;

-- When mutual follow forms, promote any request chats to active
CREATE OR REPLACE FUNCTION public.on_follow_promote_dm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the other side also follows, mutual → activate request threads
  IF EXISTS (
    SELECT 1 FROM user_follows
    WHERE follower_id = NEW.following_id AND following_id = NEW.follower_id
  ) THEN
    UPDATE dm_conversations c
    SET status = 'active', updated_at = now()
    WHERE c.status = 'request'
      AND c.id IN (
        SELECT m1.conversation_id
        FROM dm_members m1
        JOIN dm_members m2 ON m1.conversation_id = m2.conversation_id
        WHERE m1.user_id = NEW.follower_id AND m2.user_id = NEW.following_id
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS follow_promote_dm ON public.user_follows;
CREATE TRIGGER follow_promote_dm
  AFTER INSERT ON public.user_follows
  FOR EACH ROW EXECUTE FUNCTION public.on_follow_promote_dm();

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
