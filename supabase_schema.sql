-- =================================================================
-- RNS MUN '26 - Complete Supabase Database & Storage Setup
-- Run this script in the Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New query -> Paste and Run
-- =================================================================

-- 1. Create 'registrations' Table (Individual Delegates: Internal & External)
CREATE TABLE IF NOT EXISTS public.registrations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    delegate_type TEXT NOT NULL,
    name TEXT NOT NULL,
    institution TEXT,
    usn TEXT,
    city TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    mun_experience TEXT,
    experience_count TEXT,
    experience_details TEXT,
    committee1 TEXT,
    portfolio1_1 TEXT,
    portfolio1_2 TEXT,
    committee2 TEXT,
    portfolio2_1 TEXT,
    portfolio2_2 TEXT,
    ieee_id TEXT,
    payment_amount TEXT,
    screenshot_url TEXT,
    status TEXT DEFAULT 'Pending Verification' NOT NULL
);

-- Index for fast email lookups and duplicate prevention
CREATE INDEX IF NOT EXISTS idx_registrations_email ON public.registrations (LOWER(email));

-- 2. Create 'delegations' Table (College / School Delegations)
CREATE TABLE IF NOT EXISTS public.delegations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    delegation_name TEXT NOT NULL,
    delegation_type TEXT NOT NULL,
    head_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    member_count INTEGER DEFAULT 9 NOT NULL,
    roster_data JSONB,
    payment_amount TEXT,
    screenshot_url TEXT,
    status TEXT DEFAULT 'Pending Verification' NOT NULL
);

-- Index for fast delegation email lookups
CREATE INDEX IF NOT EXISTS idx_delegations_email ON public.delegations (LOWER(email));

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegations ENABLE ROW LEVEL SECURITY;

-- 4. Policies: Allow Service Role full access, Anon insert/select
DROP POLICY IF EXISTS "Allow anonymous inserts to registrations" ON public.registrations;
CREATE POLICY "Allow anonymous inserts to registrations" ON public.registrations
    FOR INSERT TO anon, service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select for registrations" ON public.registrations;
CREATE POLICY "Allow select for registrations" ON public.registrations
    FOR SELECT TO anon, service_role
    USING (true);

DROP POLICY IF EXISTS "Allow anonymous inserts to delegations" ON public.delegations;
CREATE POLICY "Allow anonymous inserts to delegations" ON public.delegations
    FOR INSERT TO anon, service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select for delegations" ON public.delegations;
CREATE POLICY "Allow select for delegations" ON public.delegations
    FOR SELECT TO anon, service_role
    USING (true);

-- 5. Create Storage Bucket for Payment Screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies
DROP POLICY IF EXISTS "Public screenshot uploads" ON storage.objects;
CREATE POLICY "Public screenshot uploads" ON storage.objects
    FOR INSERT TO anon, service_role
    WITH CHECK (bucket_id = 'payment-screenshots');

DROP POLICY IF EXISTS "Public screenshot read" ON storage.objects;
CREATE POLICY "Public screenshot read" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'payment-screenshots');

-- 6. Create 'qr_rotations' Table (Dynamic Rotation & Rate-Limiting Tracker)
CREATE TABLE IF NOT EXISTS public.qr_rotations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    upi_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qr_rotations_created_at ON public.qr_rotations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_rotations_upi_id ON public.qr_rotations (upi_id, created_at DESC);

ALTER TABLE public.qr_rotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous inserts to qr_rotations" ON public.qr_rotations;
CREATE POLICY "Allow anonymous inserts to qr_rotations" ON public.qr_rotations
    FOR INSERT TO anon, service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select for qr_rotations" ON public.qr_rotations;
CREATE POLICY "Allow select for qr_rotations" ON public.qr_rotations
    FOR SELECT TO anon, service_role
    USING (true);

