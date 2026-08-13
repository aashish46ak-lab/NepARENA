-- NepARENA social: DMs + feed foundations
-- Run in Supabase SQL Editor

-- Direct messages
CREATE TABLE IF NOT EXISTS public.dm_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dm_members (
  conversation_id uuid NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  image_url text,
  reaction text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dm_messages_conv_created_idx
  ON public.dm_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dm_members_user_idx ON public.dm_members (user_id);

-- Social posts
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  image_url text,
  pinned boolean NOT NULL DEFAULT false,
  organizer_id uuid REFERENCES public.organizers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_created_idx ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS posts_author_idx ON public.posts (author_id, created_at DESC);

ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Members can see conversations they belong to
DROP POLICY IF EXISTS "dm_members_select" ON public.dm_members;
CREATE POLICY "dm_members_select" ON public.dm_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR conversation_id IN (
    SELECT conversation_id FROM public.dm_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "dm_members_insert" ON public.dm_members;
CREATE POLICY "dm_members_insert" ON public.dm_members
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "dm_members_update" ON public.dm_members;
CREATE POLICY "dm_members_update" ON public.dm_members
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "dm_conv_select" ON public.dm_conversations;
CREATE POLICY "dm_conv_select" ON public.dm_conversations
  FOR SELECT TO authenticated
  USING (id IN (SELECT conversation_id FROM public.dm_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "dm_conv_insert" ON public.dm_conversations;
CREATE POLICY "dm_conv_insert" ON public.dm_conversations
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "dm_msg_select" ON public.dm_messages;
CREATE POLICY "dm_msg_select" ON public.dm_messages
  FOR SELECT TO authenticated
  USING (conversation_id IN (
    SELECT conversation_id FROM public.dm_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "dm_msg_insert" ON public.dm_messages;
CREATE POLICY "dm_msg_insert" ON public.dm_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM public.dm_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "dm_msg_update" ON public.dm_messages;
CREATE POLICY "dm_msg_update" ON public.dm_messages
  FOR UPDATE TO authenticated
  USING (conversation_id IN (
    SELECT conversation_id FROM public.dm_members WHERE user_id = auth.uid()
  ));

-- Posts public read
DROP POLICY IF EXISTS "posts_select" ON public.posts;
CREATE POLICY "posts_select" ON public.posts
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "posts_insert" ON public.posts;
CREATE POLICY "posts_insert" ON public.posts
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "posts_update_own" ON public.posts;
CREATE POLICY "posts_update_own" ON public.posts
  FOR UPDATE TO authenticated USING (author_id = auth.uid());

DROP POLICY IF EXISTS "posts_delete_own" ON public.posts;
CREATE POLICY "posts_delete_own" ON public.posts
  FOR DELETE TO authenticated USING (author_id = auth.uid());

DROP POLICY IF EXISTS "likes_select" ON public.post_likes;
CREATE POLICY "likes_select" ON public.post_likes
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "likes_insert" ON public.post_likes;
CREATE POLICY "likes_insert" ON public.post_likes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "likes_delete" ON public.post_likes;
CREATE POLICY "likes_delete" ON public.post_likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "comments_select" ON public.post_comments;
CREATE POLICY "comments_select" ON public.post_comments
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "comments_insert" ON public.post_comments;
CREATE POLICY "comments_insert" ON public.post_comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Find or create 1:1 conversation
CREATE OR REPLACE FUNCTION public.get_or_create_dm(other_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  conv uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF other_user IS NULL OR other_user = me THEN
    RAISE EXCEPTION 'invalid peer';
  END IF;

  SELECT m1.conversation_id INTO conv
  FROM dm_members m1
  JOIN dm_members m2 ON m1.conversation_id = m2.conversation_id
  WHERE m1.user_id = me AND m2.user_id = other_user
  LIMIT 1;

  IF conv IS NOT NULL THEN
    RETURN conv;
  END IF;

  INSERT INTO dm_conversations DEFAULT VALUES RETURNING id INTO conv;
  INSERT INTO dm_members (conversation_id, user_id) VALUES (conv, me), (conv, other_user);
  RETURN conv;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_dm(uuid) TO authenticated;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
