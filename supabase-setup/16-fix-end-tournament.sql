-- Fix: ON CONFLICT on partial unique index for tournament_history.source_tournament_id
-- Error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"

ALTER TABLE public.tournament_history
  ADD COLUMN IF NOT EXISTS third_place text,
  ADD COLUMN IF NOT EXISTS source_tournament_id uuid;

ALTER TABLE public.tournament_history
  DROP CONSTRAINT IF EXISTS tournament_history_source_tournament_id_key;

DROP INDEX IF EXISTS tournament_history_source_uniq;

CREATE UNIQUE INDEX IF NOT EXISTS tournament_history_source_uniq
  ON public.tournament_history (source_tournament_id)
  WHERE source_tournament_id IS NOT NULL;

ALTER TABLE public.hall_of_fame
  ADD COLUMN IF NOT EXISTS source_tournament_id uuid;

CREATE OR REPLACE FUNCTION public.archive_completed_tournament()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  top record;
  names text[] := array[]::text[];
  yr integer := extract(year from coalesce(new.ends_at, now()))::int;
  labels text[] := array['Champion','Runner-up','Third Place'];
  i integer := 1;
BEGIN
  IF new.status <> 'completed' OR coalesce(old.status, 'upcoming') = 'completed' THEN
    RETURN new;
  END IF;

  FOR top IN
    SELECT player_name FROM public.tournament_standings
    WHERE tournament_id = new.id
    ORDER BY points DESC, goal_diff DESC, goals_for DESC, player_name ASC
    LIMIT 3
  LOOP
    names := array_append(names, top.player_name);
  END LOOP;

  INSERT INTO public.tournament_history
    (tournament_name, winner, runner_up, third_place, year, banner_url, prize_pool, sort_order, source_tournament_id)
  VALUES (
    new.name,
    coalesce(names[1], 'TBD'),
    names[2], names[3],
    yr, new.banner_url, new.prize_pool, 0, new.id
  )
  ON CONFLICT (source_tournament_id) WHERE source_tournament_id IS NOT NULL
  DO UPDATE SET
    tournament_name = excluded.tournament_name,
    winner = excluded.winner,
    runner_up = excluded.runner_up,
    third_place = excluded.third_place,
    banner_url = excluded.banner_url,
    prize_pool = excluded.prize_pool;

  DELETE FROM public.hall_of_fame WHERE source_tournament_id = new.id;
  WHILE i <= least(coalesce(array_length(names, 1), 0), 3) LOOP
    INSERT INTO public.hall_of_fame (player_name, achievement, tournament, year, sort_order, source_tournament_id)
    VALUES (names[i], labels[i], new.name, yr, (yr * 10) + i, new.id);
    i := i + 1;
  END LOOP;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS tournament_completed_archive ON public.tournaments;
CREATE TRIGGER tournament_completed_archive
AFTER UPDATE OF status ON public.tournaments
FOR EACH ROW EXECUTE FUNCTION public.archive_completed_tournament();
