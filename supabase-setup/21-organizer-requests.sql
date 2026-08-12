-- Organizer application + request messaging
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.organizer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  org_name text NOT NULL,
  contact_name text,
  contact_email text NOT NULL,
  contact_phone text,
  logo_url text,
  banner_url text,
  theme_id text DEFAULT 'black-silver',
  primary_color text,
  secondary_color text,
  description text,
  social_links jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organizer_requests_status_idx
  ON public.organizer_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS organizer_requests_user_idx
  ON public.organizer_requests (user_id);

CREATE TABLE IF NOT EXISTS public.organizer_request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.organizer_requests(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_from_admin boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_by_applicant boolean NOT NULL DEFAULT false,
  read_by_admin boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS org_req_msg_request_idx
  ON public.organizer_request_messages (request_id, created_at);

ALTER TABLE public.organizer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_request_messages ENABLE ROW LEVEL SECURITY;

-- Applicants: insert own request, read/update own
DROP POLICY IF EXISTS "org_req_insert_auth" ON public.organizer_requests;
CREATE POLICY "org_req_insert_auth" ON public.organizer_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "org_req_select_own_or_admin" ON public.organizer_requests;
CREATE POLICY "org_req_select_own_or_admin" ON public.organizer_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(coalesce(auth.jwt() ->> 'email', '')) IN (
      'aashish46ak@gmail.com', 'baralk851@gmail.com'
    )
  );

DROP POLICY IF EXISTS "org_req_update_own_or_admin" ON public.organizer_requests;
CREATE POLICY "org_req_update_own_or_admin" ON public.organizer_requests
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(coalesce(auth.jwt() ->> 'email', '')) IN (
      'aashish46ak@gmail.com', 'baralk851@gmail.com'
    )
  );

-- Messages
DROP POLICY IF EXISTS "org_req_msg_select" ON public.organizer_request_messages;
CREATE POLICY "org_req_msg_select" ON public.organizer_request_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizer_requests r
      WHERE r.id = request_id
        AND (
          r.user_id = auth.uid()
          OR lower(coalesce(auth.jwt() ->> 'email', '')) IN (
            'aashish46ak@gmail.com', 'baralk851@gmail.com'
          )
        )
    )
  );

DROP POLICY IF EXISTS "org_req_msg_insert" ON public.organizer_request_messages;
CREATE POLICY "org_req_msg_insert" ON public.organizer_request_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.organizer_requests r
      WHERE r.id = request_id
        AND (
          r.user_id = auth.uid()
          OR lower(coalesce(auth.jwt() ->> 'email', '')) IN (
            'aashish46ak@gmail.com', 'baralk851@gmail.com'
          )
        )
    )
  );

DROP POLICY IF EXISTS "org_req_msg_update" ON public.organizer_request_messages;
CREATE POLICY "org_req_msg_update" ON public.organizer_request_messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizer_requests r
      WHERE r.id = request_id
        AND (
          r.user_id = auth.uid()
          OR lower(coalesce(auth.jwt() ->> 'email', '')) IN (
            'aashish46ak@gmail.com', 'baralk851@gmail.com'
          )
        )
    )
  );

-- Ensure default organizer row exists (theme save)
INSERT INTO public.organizers (slug, name, status, is_verified, contact_email)
SELECT 'efootball-nepal', 'eFootball Nepal', 'active', true, 'aashish46ak@gmail.com'
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizers WHERE slug = 'efootball-nepal'
);

ALTER TABLE public.organizers
  ADD COLUMN IF NOT EXISTS theme_id text DEFAULT 'black-silver';

DO $$ BEGIN
  RAISE NOTICE '21-organizer-requests applied';
END $$;
