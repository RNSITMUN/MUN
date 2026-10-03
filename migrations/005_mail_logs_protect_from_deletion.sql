-- Migration 005: mail_logs is an append-only audit log. Block accidental/unintended deletion.
-- Run once in Supabase SQL Editor. Idempotent. (Inserts and in-place status UPDATEs are unaffected.)

CREATE OR REPLACE FUNCTION public.mail_logs_block_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'mail_logs is append-only: DELETE is blocked. To purge deliberately, DROP TRIGGER trg_mail_logs_no_delete first.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mail_logs_no_delete ON public.mail_logs;
CREATE TRIGGER trg_mail_logs_no_delete
  BEFORE DELETE ON public.mail_logs
  FOR EACH ROW EXECUTE FUNCTION public.mail_logs_block_delete();

-- TRUNCATE bypasses row triggers, so block it separately.
CREATE OR REPLACE FUNCTION public.mail_logs_block_truncate() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'mail_logs is append-only: TRUNCATE is blocked.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mail_logs_no_truncate ON public.mail_logs;
CREATE TRIGGER trg_mail_logs_no_truncate
  BEFORE TRUNCATE ON public.mail_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.mail_logs_block_truncate();

-- Verify current row count (compare with what the admin Mail Log tab shows)
SELECT count(*) AS mail_logs_rows FROM public.mail_logs;
