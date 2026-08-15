-- NepARENA: Nepal-timezone login streaks + founder verified badges
-- Run in Supabase SQL editor after verified_and_follow_fix.sql

-- 1) Ensure is_verified column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- Founders blue tick
UPDATE public.profiles p
SET is_verified = true
FROM auth.users u
WHERE p.id = u.id
  AND lower(u.email) IN (
    'aashish46ak@gmail.com',
    'baralk851@gmail.com'
  );

-- 2) Login streak using Asia/Kathmandu calendar day (midnight local)
CREATE OR REPLACE FUNCTION public.record_login_streak()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  -- Nepal Standard Time — day rolls at local midnight
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

  -- Already logged in today (Nepal calendar) — fire stays lit
  IF prev IS NOT NULL AND prev = today THEN
    RETURN jsonb_build_object(
      'ok', true,
      'streak', cur,
      'longest', longest,
      'already_today', true
    );
  END IF;

  -- Consecutive day → increment; otherwise reset to 1
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

-- Optional: zero out stale streaks (no login yesterday or today, Nepal time)
CREATE OR REPLACE FUNCTION public.expire_stale_streaks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := (timezone('Asia/Kathmandu', now()))::date;
  n integer;
BEGIN
  UPDATE profiles
  SET login_streak = 0
  WHERE login_streak > 0
    AND (last_login_date IS NULL OR last_login_date < today - 1);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_stale_streaks() TO service_role;

-- 3) Admin set profile verified (idempotent)
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

  UPDATE public.profiles
  SET is_verified = p_verified
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_profile_verified(uuid, boolean) TO authenticated;
