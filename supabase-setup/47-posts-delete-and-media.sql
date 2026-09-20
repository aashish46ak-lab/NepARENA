-- 47: posts media columns + reliable delete (owner + platform admin)
-- Run once in Supabase SQL Editor

-- Optional media columns (safe if already exist)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS video_url text;

-- Owner delete (idempotent)
DROP POLICY IF EXISTS "posts_delete_own" ON public.posts;
CREATE POLICY "posts_delete_own" ON public.posts
  FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- Platform admin delete by email allow-list (matches app SUPER_ADMIN_EMAILS)
DROP POLICY IF EXISTS "posts_delete_platform_admin" ON public.posts;
CREATE POLICY "posts_delete_platform_admin" ON public.posts
  FOR DELETE TO authenticated
  USING (
    lower(coalesce(auth.jwt() ->> 'email', '')) IN (
      'aashish46ak@gmail.com',
      'baralk851@gmail.com'
    )
  );

-- RPC for admin delete (bypasses awkward RLS edge cases)
CREATE OR REPLACE FUNCTION public.admin_delete_post(p_post_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF email NOT IN ('aashish46ak@gmail.com', 'baralk851@gmail.com') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  DELETE FROM public.posts WHERE id = p_post_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_post(uuid) TO authenticated;

COMMENT ON FUNCTION public.admin_delete_post IS 'Platform admin hard-delete any post';
