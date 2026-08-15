-- Instagram-style stories (24h) for NepARENA feed
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.user_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'text'
    CHECK (media_type IN ('text', 'photo', 'video')),
  body text,
  media_url text,
  bg_color text DEFAULT '#0ea5e9',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  view_count int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS user_stories_user_idx ON public.user_stories (user_id);
CREATE INDEX IF NOT EXISTS user_stories_expires_idx ON public.user_stories (expires_at);

CREATE TABLE IF NOT EXISTS public.story_views (
  story_id uuid NOT NULL REFERENCES public.user_stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);

ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stories_select_active" ON public.user_stories;
CREATE POLICY "stories_select_active" ON public.user_stories
  FOR SELECT TO authenticated
  USING (expires_at > now());

DROP POLICY IF EXISTS "stories_insert_own" ON public.user_stories;
CREATE POLICY "stories_insert_own" ON public.user_stories
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "stories_delete_own" ON public.user_stories;
CREATE POLICY "stories_delete_own" ON public.user_stories
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "story_views_select" ON public.story_views;
CREATE POLICY "story_views_select" ON public.story_views
  FOR SELECT TO authenticated
  USING (
    viewer_id = auth.uid()
    OR story_id IN (SELECT id FROM public.user_stories WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "story_views_insert" ON public.story_views;
CREATE POLICY "story_views_insert" ON public.story_views
  FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.user_stories TO authenticated;
GRANT SELECT, INSERT ON public.story_views TO authenticated;
