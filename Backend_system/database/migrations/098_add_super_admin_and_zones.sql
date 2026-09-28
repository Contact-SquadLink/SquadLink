-- ============================================
-- Migration: 098_add_super_admin_and_zones
-- Description: Add SUPER_ADMIN role, service zones, and dual-path rider fields
-- ============================================

-- 1. Add SUPER_ADMIN to user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- 2. Create service_zones table
CREATE TABLE IF NOT EXISTS public.service_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  center_location GEOGRAPHY(POINT, 4326) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 5000,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_zones_code ON public.service_zones(code);
CREATE INDEX IF NOT EXISTS idx_service_zones_center ON public.service_zones USING GIST (center_location);

-- Seed primary pilot corridor (Gwallameji-Yelwa) and expansion zones in Bauchi
INSERT INTO public.service_zones (code, name, description, center_location, radius_meters, is_active)
VALUES
  ('GWALLAMEJI_YELWA', 'Gwallameji-Yelwa Corridor', 'Primary pilot corridor covering ATBU Bauchi, Gwallameji community and Yelwa commercial district', ST_SetSRID(ST_MakePoint(9.8167, 10.2833), 4326)::geography, 6000, TRUE),
  ('BAUCHI_CENTRAL', 'Bauchi Central / GRA', 'Expansion zone covering Central Market, Emir Palace, and Government Residential Area', ST_SetSRID(ST_MakePoint(9.8433, 10.3158), 4326)::geography, 7000, TRUE),
  ('FADAMA_RAILWAY', 'Fadama / Railway Corridor', 'Expansion zone covering Railway station, Fadama markets and surrounding commerce', ST_SetSRID(ST_MakePoint(9.8300, 10.3300), 4326)::geography, 5000, TRUE),
  ('DASS_CORRIDOR', 'Dass Road Corridor', 'Secondary expansion corridor along Dass Road connecting outlying artisan clusters', ST_SetSRID(ST_MakePoint(9.7900, 10.2500), 4326)::geography, 6000, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 3. Add device_type, registered_phone_number, and service_zone_id to riders table
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS device_type VARCHAR(20) NOT NULL DEFAULT 'SMARTPHONE',
  ADD COLUMN IF NOT EXISTS registered_phone_number VARCHAR(30),
  ADD COLUMN IF NOT EXISTS service_zone_id UUID REFERENCES public.service_zones(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_riders_device_type'
  ) THEN
    ALTER TABLE public.riders
      ADD CONSTRAINT chk_riders_device_type
      CHECK (device_type IN ('SMARTPHONE', 'FEATURE_PHONE')) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_riders_device_type ON public.riders(device_type);
CREATE INDEX IF NOT EXISTS idx_riders_phone_number ON public.riders(registered_phone_number);
CREATE INDEX IF NOT EXISTS idx_riders_service_zone ON public.riders(service_zone_id);

-- Backfill registered_phone_number from users table where missing
UPDATE public.riders r
SET registered_phone_number = u.phone_number
FROM public.users u
WHERE u.id = r.user_id AND r.registered_phone_number IS NULL AND u.phone_number IS NOT NULL;

-- Associate existing riders without a service zone to the default Gwallameji-Yelwa corridor
UPDATE public.riders
SET service_zone_id = (SELECT id FROM public.service_zones WHERE code = 'GWALLAMEJI_YELWA' LIMIT 1)
WHERE service_zone_id IS NULL;
