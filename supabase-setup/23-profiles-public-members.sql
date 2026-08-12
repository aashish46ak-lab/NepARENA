-- Public member profiles + storage safety net
-- Run in Supabase SQL Editor after 19/20/21/22

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles read" ON public.profiles;
CREATE POLICY "profiles read" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles insert self" ON public.profiles;
CREATE POLICY "profiles insert self" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles update self" ON public.profiles;
CREATE POLICY "profiles update self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE VIEW public.public_members AS
SELECT
  id,
  username,
  full_name,
  avatar_url,
  favourite_club,
  bio,
  country,
  created_at
FROM public.profiles
WHERE coalesce(is_suspended, false) = false;

GRANT SELECT ON public.public_members TO anon, authenticated;

ALTER TABLE public.organizer_followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "followers_select_public_count" ON public.organizer_followers;
CREATE POLICY "followers_select_public_count" ON public.organizer_followers
  FOR SELECT TO anon, authenticated
  USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ BEGIN
  CREATE POLICY "storage_public_read" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id IN ('avatars','public','media'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "storage_auth_upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id IN ('avatars','public','media'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  RAISE NOTICE '23-profiles-public-members applied';
END $$;
