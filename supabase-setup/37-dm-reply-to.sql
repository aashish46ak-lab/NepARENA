-- Optional reply_to on DM messages
-- Idempotent; run after 26-social-dm-feed.sql / 31-dm-groups-edit.sql

ALTER TABLE public.dm_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.dm_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS dm_messages_reply_to_idx
  ON public.dm_messages (reply_to_id)
  WHERE reply_to_id IS NOT NULL;
