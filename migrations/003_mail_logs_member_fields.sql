-- =================================================================
-- Migration 003: extra columns on the shared public.mail_logs table
-- Safe & idempotent. Run in Supabase SQL Editor.
-- The app works without it (api/send-mail.js falls back to base columns),
-- but with it the Mail Log can show committee / delegation / member per row.
-- =================================================================
ALTER TABLE public.mail_logs ADD COLUMN IF NOT EXISTS member_index INT;
ALTER TABLE public.mail_logs ADD COLUMN IF NOT EXISTS committee TEXT;
ALTER TABLE public.mail_logs ADD COLUMN IF NOT EXISTS delegation TEXT;
