-- Migration 004: make public.mail_logs the single, real-time-synced mail log for all admin devices.
-- Run once in Supabase SQL Editor. Idempotent.

ALTER TABLE public.mail_logs ADD COLUMN IF NOT EXISTS error TEXT;
ALTER TABLE public.mail_logs ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 1;
ALTER TABLE public.mail_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Signed-in admins connect with the 'authenticated' role: they need SELECT for Realtime to deliver rows.
DROP POLICY IF EXISTS "Allow authenticated select on mail_logs" ON public.mail_logs;
CREATE POLICY "Allow authenticated select on mail_logs" ON public.mail_logs
  FOR SELECT TO authenticated USING (true);

-- Realtime sends full old/new rows for UPDATEs (queued -> sent / failed).
ALTER TABLE public.mail_logs REPLICA IDENTITY FULL;

-- Publish table changes over Supabase Realtime.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mail_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mail_logs;
  END IF;
END $$;
