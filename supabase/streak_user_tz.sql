-- NepARENA: login streak by user's local timezone (midnight in their country)
-- Client passes IANA tz e.g. Asia/Kathmandu, America/New_York via record_login_streak(p_tz)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone text;

CREATE OR REPLACE FUNCTION public.record_login_streak(p_tz text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  tz text;
  today date;
  prev date;
  cur integer;
  longest integer;
  new_streak integer;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Prefer client tz, else profile.timezone, else Asia/Kathmandu
  tz := NULLIF(trim(p_tz), '');
  IF tz IS NULL THEN
    SELECT NULLIF(trim(timezone), '') INTO tz FROM profiles WHERE id = uid;
  END IF;
  IF tz IS NULL OR tz = '' THEN
    tz := 'Asia/Kathmandu';
  END IF;

  -- Validate tz by trying conversion; fall back on error
  BEGIN
    today := (timezone(tz, now()))::date;
  EXCEPTION WHEN OTHERS THEN
    tz := 'Asia/Kathmandu';
    today := (timezone(tz, now()))::date;
  END;

  -- Persist tz for next logins
  UPDATE profiles SET timezone = tz WHERE id = uid AND (timezone IS DISTINCT FROM tz);

  SELECT last_login_date, login_streak, longest_login_streak
    INTO prev, cur, longest
  FROM profiles
  WHERE id = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_profile');
  END IF;

  -- Already logged in today (user's calendar) — fire stays lit
  IF prev IS NOT NULL AND prev = today THEN
    RETURN jsonb_build_object(
      'ok', true,
      'streak', COALESCE(cur, 0),
      'longest', COALESCE(longest, 0),
      'already_today', true,
      'tz', tz
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
    'already_today', false,
    'tz', tz
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_login_streak(text) TO authenticated;

-- Reliable public follower count (RLS-safe)
CREATE OR REPLACE FUNCTION public.get_organizer_follower_count(p_organizer_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.organizer_followers
  WHERE organizer_id = p_organizer_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_organizer_follower_count(uuid) TO anon, authenticated;
