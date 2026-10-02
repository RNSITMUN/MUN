-- Migration 003: Correct Joel Thomas (individual registration #194, IND-194)
-- allocation from "State of Palestine" to the United Kingdom in UNHRC.
-- Run in Supabase SQL Editor (idempotent; safe to run more than once).
INSERT INTO public.delegate_checkpoints
  (record_type, record_id, member_index, checkpoint_key, redeemed, redeemed_by, allocated_committee, allocated_portfolio)
VALUES
  ('individual', '194', 0, 'allocation', true, 'Admin correction', 'UNHRC', 'United Kingdom of Great Britain and Northern Ireland')
ON CONFLICT (record_type, record_id, member_index, checkpoint_key)
DO UPDATE SET
  allocated_committee = 'UNHRC',
  allocated_portfolio = 'United Kingdom of Great Britain and Northern Ireland',
  redeemed_at = TIMEZONE('utc'::text, NOW());

-- Verify
SELECT record_id, allocated_committee, allocated_portfolio
FROM public.delegate_checkpoints
WHERE record_type = 'individual' AND record_id = '194' AND checkpoint_key = 'allocation';
