-- Migration 103: Add terms_accepted and terms_accepted_at to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Backfill existing users as having accepted terms on account creation
UPDATE public.users
SET terms_accepted = TRUE,
    terms_accepted_at = COALESCE(created_at, NOW())
WHERE terms_accepted IS FALSE;
