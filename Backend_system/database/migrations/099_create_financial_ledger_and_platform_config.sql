-- ============================================
-- Migration: 099_create_financial_ledger_and_platform_config
-- Description: Double-entry financial ledger and platform configurations
-- ============================================

-- 1. Create financial_ledger_entries table
CREATE TABLE IF NOT EXISTS public.financial_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE RESTRICT,
  entry_group_id UUID NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  entry_type VARCHAR(10) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  description VARCHAR(255) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_financial_ledger_entry_type CHECK (entry_type IN ('DEBIT', 'CREDIT')),
  CONSTRAINT chk_financial_ledger_amount CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_financial_ledger_order_id ON public.financial_ledger_entries(order_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_group_id ON public.financial_ledger_entries(entry_group_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_account ON public.financial_ledger_entries(account_name);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_created_at ON public.financial_ledger_entries(created_at DESC);

-- 2. Create business_wallets table (parallel to rider_wallets)
CREATE TABLE IF NOT EXISTS public.business_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  current_balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_wallets_business_id ON public.business_wallets(business_id);

-- Initialize business wallets for existing businesses
INSERT INTO public.business_wallets (business_id)
SELECT id FROM public.businesses
ON CONFLICT (business_id) DO NOTHING;

-- 3. Create platform_configurations table for managing pilot parameters
CREATE TABLE IF NOT EXISTS public.platform_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(80) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default pilot parameters
INSERT INTO public.platform_configurations (key, value, description)
VALUES
  ('customer_fee_target', '{"amount": 120, "min": 100, "max": 150, "currency": "NGN"}'::jsonb, 'Pilot customer service fee target in NGN'),
  ('merchant_commission_rate', '{"rate": 0.10, "minRate": 0.05, "maxRate": 0.20}'::jsonb, 'Standard merchant commission rate (e.g. 10%)'),
  ('delivery_pricing_tiers', '{"baseFee": 350, "perKmRate": 50, "minimumPayout": 300, "riderSharePercent": 80}'::jsonb, 'Delivery pricing tiers and rider payout share'),
  ('gateway_cost_assumptions', '{"percentageRate": 0.015, "capAmount": 2000, "flatFee": 0}'::jsonb, 'Gateway processing transaction cost assumptions')
ON CONFLICT (key) DO NOTHING;
