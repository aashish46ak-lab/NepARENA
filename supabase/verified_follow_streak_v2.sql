-- NepARENA v2: verified badges + follow fix + Asia/Kathmandu streaks
-- Run entire file in Supabase SQL Editor

-- ========== VERIFIED BADGES ==========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

UPDATE public.profiles p
SET is_verified = true
FROM auth.users u
WHERE p.id = u.id
  AND lower(u.email) IN ('aashish46ak@gmail.com', 'baralk851@gmail.com');

CREATE OR REPLACE FUNCTION public.admin_set_profile_verified(
  p_user_id uuid,
  p_verified boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email NOT IN (
    'aashish46ak@gmail.com',
    'baralk851@gmail.com'
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.profiles SET is_verified = p_verified WHERE id = p_user_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_profile_verified(uuid, boolean) TO authenticated;

-- ========== ORGANIZER FOLLOW (persistent) ==========
CREATE OR REPLACE FUNCTION public.secure_follow_organizer(p_organizer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  INSERT INTO public.organizer_followers (organizer_id, user_id)
  VALUES (p_organizer_id, auth.uid())
  ON CONFLICT (organizer_id, user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_unfollow_organizer(p_organizer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  DELETE FROM public.organizer_followers
  WHERE organizer_id = p_organizer_id AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.secure_follow_organizer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secure_unfollow_organizer(uuid) TO authenticated;

ALTER TABLE public.organizer_followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_followers_select" ON public.organizer_followers;
CREATE POLICY "org_followers_select" ON public.organizer_followers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "org_followers_insert_own" ON public.organizer_followers;
CREATE POLICY "org_followers_insert_own" ON public.organizer_followers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "org_followers_delete_own" ON public.organizer_followers;
CREATE POLICY "org_followers_delete_own" ON public.organizer_followers
  FOR DELETE USING (auth.uid() = user_id);

-- ========== STREAKS (Asia/Kathmandu calendar day) ==========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_login_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_date date;

CREATE OR REPLACE FUNCTION public.record_login_streak()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  -- Local calendar day in Nepal (UTC+5:45)
  today date := (timezone('Asia/Kathmandu', now()))::date;
  prev date;
  cur integer;
  longest integer;
  new_streak integer;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT last_login_date, login_streak, longest_login_streak
    INTO prev, cur, longest
  FROM profiles
  WHERE id = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_profile');
  END IF;

  -- Already counted for this local day → keep fire lit
  IF prev IS NOT NULL AND prev = today THEN
    RETURN jsonb_build_object(
      'ok', true,
      'streak', cur,
      'longest', longest,
      'already_today', true
    );
  END IF;

  -- Consecutive local day → increment; otherwise reset to 1
  IF prev IS NOT NULL AND prev = today - 1 THEN
    new_streak := COALESCE(cur, 0) + 1;
  ELSE
    new_streak := 1;
  END IF;

  longest := GREATEST(COALESCE(longest, 0), new_streak);

  UPDATE profiles
  SET
    login_streak = new_streak,
    longest_login_streak = longest,
    last_login_date = today
  WHERE id = uid;

  RETURN jsonb_build_object(
    'ok', true,
    'streak', new_streak,
    'longest', longest,
    'already_today', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_login_streak() TO authenticated;

-- ========== DM ADMIN DELETE ==========
CREATE OR REPLACE FUNCTION public.admin_delete_dm_message(p_message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email NOT IN (
    'aashish46ak@gmail.com',
    'baralk851@gmail.com'
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.dm_messages WHERE id = p_message_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_dm_message(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.soft_delete_dm_message(p_message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.dm_messages
  SET body = NULL,
      image_url = NULL,
      reaction = NULL,
      deleted_at = now()
  WHERE id = p_message_id
    AND sender_id = auth.uid();
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_dm_message(uuid) TO authenticated;
