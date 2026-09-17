-- ============================================
-- Migration: 079_add_user_first_last_name
-- Description: Add first_name and last_name columns to users table
-- ============================================

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
