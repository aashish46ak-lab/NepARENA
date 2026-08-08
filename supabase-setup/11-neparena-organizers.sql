-- ============================================================
-- NepARENA multi-tenant foundation (NON-BREAKING)
-- Run ONLY when ready on a staging DB, or on production AFTER
-- explicit "Deploy Now". Safe to run: additive columns/tables.
-- ============================================================

-- 1) Organizers (each brand/workspace under NepARENA)
CREATE TABLE IF NOT EXISTS public.organizers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  description text,
  logo_url text,
  banner_url text,
  primary_color text DEFAULT '#2563eb',
  secondary_color text DEFAULT '#dc2626',
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  is_verified boolean NOT NULL DEFAULT false,
  website_url text,
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organizers_slug_idx ON public.organizers (slug);
CREATE INDEX IF NOT EXISTS organizers_owner_idx ON public.organizers (owner_user_id);
CREATE INDEX IF NOT EXISTS organizers_status_idx ON public.organizers (status);

-- 2) Organizer membership (owner / admin / moderator)
CREATE TABLE IF NOT EXISTS public.organizer_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'moderator'
    CHECK (role IN ('owner', 'admin', 'moderator')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organizer_id, user_id)
);

CREATE INDEX IF NOT EXISTS organizer_members_user_idx ON public.organizer_members (user_id);

-- 3) Followers (users follow organizers)
CREATE TABLE IF NOT EXISTS public.organizer_followers (
  organizer_id uuid NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organizer_id, user_id)
);

CREATE INDEX IF NOT EXISTS organizer_followers_user_idx ON public.organizer_followers (user_id);

-- 4) Invitation tokens for new organizers
CREATE TABLE IF NOT EXISTS public.organizer_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organizer_id uuid REFERENCES public.organizers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5) Attach existing tournaments to an organizer (nullable = legacy / global)
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS organizer_id uuid REFERENCES public.organizers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tournaments_organizer_idx ON public.tournaments (organizer_id);

-- 6) Seed default organizer: eFootball Nepal (idempotent)
INSERT INTO public.organizers (slug, name, tagline, description, status, is_verified, contact_email)
VALUES (
  'efootball-nepal',
  'eFootball Nepal',
  'The official home of competitive eFootball in Nepal',
  'Tournaments, community, hall of fame, and esports updates for Nepal.',
  'active',
  true,
  'aashish46ak@gmail.com'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  status = 'active',
  is_verified = true,
  updated_at = now();

-- 7) Link existing tournaments that have no organizer yet
UPDATE public.tournaments t
SET organizer_id = o.id
FROM public.organizers o
WHERE o.slug = 'efootball-nepal'
  AND t.organizer_id IS NULL;

-- 8) RLS (read public active organizers; writes later via policies/RPC)
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active organizers" ON public.organizers;
CREATE POLICY "Public can read active organizers"
  ON public.organizers FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "Users read own organizer membership" ON public.organizer_members;
CREATE POLICY "Users read own organizer membership"
  ON public.organizer_members FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own follows" ON public.organizer_followers;
CREATE POLICY "Users manage own follows"
  ON public.organizer_followers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read follower counts via select" ON public.organizer_followers;
CREATE POLICY "Public read follower counts via select"
  ON public.organizer_followers FOR SELECT
  USING (true);

-- Super-admin helpers can be expanded later with SECURITY DEFINER functions.
COMMENT ON TABLE public.organizers IS 'NepARENA multi-tenant workspaces; eFootball Nepal is the first organizer.';
