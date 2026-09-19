-- ============================================
-- Migration: 080_add_admin_approval_fields
-- Description: Add admin approval controls for platform-only admin access
-- ============================================

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS approved_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ NULL;

UPDATE public.users
SET admin_approved = TRUE,
    approved_at = NOW()
WHERE role = 'ADMIN'
  AND email = 'contact.squadlink@gmail.com';

UPDATE public.users
SET admin_approved = FALSE,
    approved_at = NULL
WHERE role = 'ADMIN'
  AND email <> 'contact.squadlink@gmail.com';
