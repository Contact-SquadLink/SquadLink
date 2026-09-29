-- ============================================================
-- Migration: 101_add_user_profile_security_and_verifications.sql
-- Description: Adds username, avatar, profile edit timestamp,
--              and user verification/recovery OTP records.
-- ============================================================

-- 1. Add profile fields to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_updated_at TIMESTAMPTZ;

-- 2. Backfill existing users with unique usernames if null
DO $$
DECLARE
  rec RECORD;
  base_uname TEXT;
  candidate TEXT;
  counter INT;
BEGIN
  FOR rec IN SELECT id, email, first_name, last_name, phone_number FROM public.users WHERE username IS NULL LOOP
    IF rec.email = 'contact.squadlink@gmail.com' THEN
      base_uname := 'squadlink_admin';
    ELSIF rec.first_name IS NOT NULL AND LENGTH(TRIM(rec.first_name)) > 0 THEN
      base_uname := LOWER(REGEXP_REPLACE(TRIM(rec.first_name), '[^a-zA-Z0-9]', '', 'g'));
      IF LENGTH(base_uname) < 3 THEN
        base_uname := 'user';
      END IF;
    ELSE
      base_uname := 'user';
    END IF;

    -- Append unique suffix from user ID
    candidate := base_uname || '_' || SUBSTRING(REPLACE(rec.id::text, '-', ''), 1, 4);

    -- Ensure uniqueness
    counter := 1;
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = candidate AND id <> rec.id) LOOP
      candidate := base_uname || '_' || SUBSTRING(REPLACE(rec.id::text, '-', ''), 1, 4) || counter::text;
      counter := counter + 1;
    END LOOP;

    UPDATE public.users SET username = candidate WHERE id = rec.id;
  END LOOP;
END $$;

-- 3. Verification & Account Recovery OTPs
CREATE TABLE IF NOT EXISTS public.user_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL, -- 'EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET'
  identifier VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_verifications_lookup
  ON public.user_verifications(identifier, type, code);

CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id
  ON public.user_verifications(user_id);
