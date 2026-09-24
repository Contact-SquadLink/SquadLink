ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'RIDER_APPLICATION_APPROVED';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'RIDER_APPLICATION_REJECTED';

CREATE TABLE IF NOT EXISTS public.rider_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL UNIQUE,
  current_balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_rider_wallets_rider
    FOREIGN KEY (rider_id) REFERENCES public.riders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rider_wallets_rider_id
  ON public.rider_wallets(rider_id);

CREATE TYPE public.rider_verification_status AS ENUM (
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'SUSPENDED'
);

CREATE TABLE public.rider_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL UNIQUE,
  status public.rider_verification_status NOT NULL DEFAULT 'PENDING',
  verified_by UUID,
  verification_notes TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_rider_verifications_rider
    FOREIGN KEY (rider_id) REFERENCES public.riders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_rider_verifications_verified_by
    FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_rider_verifications_verified
    CHECK (status <> 'VERIFIED' OR verified_at IS NOT NULL)
);

CREATE INDEX idx_rider_verifications_status
  ON public.rider_verifications(status);

CREATE TABLE public.rider_verification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL,
  previous_status public.rider_verification_status,
  new_status public.rider_verification_status NOT NULL,
  reason TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_rider_verification_history_rider
    FOREIGN KEY (rider_id) REFERENCES public.riders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_rider_verification_history_changed_by
    FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_rider_verification_history_rider_id
  ON public.rider_verification_history(rider_id);