-- =================================================================
-- Safe Migration: Create mail_log Table for RNS MUN 2026
-- Run in Supabase SQL Editor: Dashboard -> SQL Editor -> New query -> Paste and Run
-- =================================================================

CREATE TABLE IF NOT EXISTS public.mail_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  batch_id UUID,
  registration_id TEXT,
  delegate_name TEXT,
  recipient_email TEXT NOT NULL,
  delegation TEXT,
  committee TEXT,
  whatsapp_link TEXT,
  subject TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  error TEXT,
  provider_message_id TEXT,
  attempts INT DEFAULT 1 NOT NULL,
  sent_at TIMESTAMPTZ
);

-- Indexes on (status), (committee), (delegation), (recipient_email), (created_at desc)
CREATE INDEX IF NOT EXISTS idx_mail_log_status ON public.mail_log (status);
CREATE INDEX IF NOT EXISTS idx_mail_log_committee ON public.mail_log (committee);
CREATE INDEX IF NOT EXISTS idx_mail_log_delegation ON public.mail_log (delegation);
CREATE INDEX IF NOT EXISTS idx_mail_log_recipient_email ON public.mail_log (recipient_email);
CREATE INDEX IF NOT EXISTS idx_mail_log_created_at_desc ON public.mail_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_log_idempotency ON public.mail_log (recipient_email, registration_id, status);

-- Enable RLS with NO public policies
ALTER TABLE public.mail_log ENABLE ROW LEVEL SECURITY;

-- Only server-side code using the service-role key may read/write it.
DROP POLICY IF EXISTS "Service role full access on mail_log" ON public.mail_log;
CREATE POLICY "Service role full access on mail_log" ON public.mail_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
