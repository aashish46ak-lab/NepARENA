-- Login streak system for NepARENA profiles
-- Run in Supabase SQL editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_login_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_date date;

COMMENT ON COLUMN public.profiles.login_streak IS 'Current consecutive daily login streak';
COMMENT ON COLUMN public.profiles.longest_login_streak IS 'Best streak ever achieved';
COMMENT ON COLUMN public.profiles.last_login_date IS 'UTC date of last recorded login for streak';

CREATE OR REPLACE FUNCTION public.record_login_streak()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (timezone('utc', now()))::date;
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

  IF prev IS NOT NULL AND prev = today THEN
    RETURN jsonb_build_object(
      'ok', true,
      'streak', cur,
      'longest', longest,
      'already_today', true
    );
  END IF;

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

-- Quiz scores (optional persistence)
CREATE TABLE IF NOT EXISTS public.daily_quiz_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_date date NOT NULL DEFAULT (timezone('utc', now()))::date,
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quiz_date)
);

ALTER TABLE public.daily_quiz_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_select_own" ON public.daily_quiz_scores;
CREATE POLICY "quiz_select_own" ON public.daily_quiz_scores
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "quiz_insert_own" ON public.daily_quiz_scores;
CREATE POLICY "quiz_insert_own" ON public.daily_quiz_scores
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "quiz_update_own" ON public.daily_quiz_scores;
CREATE POLICY "quiz_update_own" ON public.daily_quiz_scores
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "quiz_select_public_leaderboard" ON public.daily_quiz_scores;
CREATE POLICY "quiz_select_public_leaderboard" ON public.daily_quiz_scores
  FOR SELECT TO anon, authenticated USING (true);
