-- 29: Organizer-attributed posts + safe delete for own posts/reposts
-- Run after 28-dm-rls-fix.sql

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS organizer_id uuid REFERENCES public.organizers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_organizer_id_idx
  ON public.posts (organizer_id)
  WHERE organizer_id IS NOT NULL;

-- Allow authors to delete their own posts (including reposts)
DROP POLICY IF EXISTS "posts_delete_own" ON public.posts;
CREATE POLICY "posts_delete_own" ON public.posts
  FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- Allow authors to update their own posts (edit body)
DROP POLICY IF EXISTS "posts_update_own" ON public.posts;
CREATE POLICY "posts_update_own" ON public.posts
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());
