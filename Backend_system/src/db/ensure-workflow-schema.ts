import { db } from "./database";

export async function ensureWorkflowSchema(): Promise<void> {
  try {
    await db.query(`ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'`);
  } catch {
    // Already exists or unsupported inside sub-transaction
  }

  await db.query(`
    -- Orders fee columns
    ALTER TABLE public.orders
      ADD COLUMN IF NOT EXISTS platform_fee_amount BIGINT NOT NULL DEFAULT 0;

    ALTER TABLE public.orders
      ADD COLUMN IF NOT EXISTS business_fee_amount BIGINT NOT NULL DEFAULT 0;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_platform_fee'
      ) THEN
        ALTER TABLE public.orders
          ADD CONSTRAINT chk_orders_platform_fee CHECK (platform_fee_amount >= 0) NOT VALID;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_business_fee'
      ) THEN
        ALTER TABLE public.orders
          ADD CONSTRAINT chk_orders_business_fee CHECK (business_fee_amount >= 0) NOT VALID;
      END IF;
    END $$;

    -- Service zones
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

    INSERT INTO public.service_zones (code, name, description, center_location, radius_meters, is_active)
    VALUES
      ('GWALLAMEJI_YELWA', 'Gwallameji-Yelwa Corridor', 'Primary pilot corridor covering ATBU Bauchi, Gwallameji community and Yelwa commercial district', ST_SetSRID(ST_MakePoint(9.8167, 10.2833), 4326)::geography, 6000, TRUE),
      ('BAUCHI_CENTRAL', 'Bauchi Central / GRA', 'Expansion zone covering Central Market, Emir Palace, and Government Residential Area', ST_SetSRID(ST_MakePoint(9.8433, 10.3158), 4326)::geography, 7000, TRUE),
      ('FADAMA_RAILWAY', 'Fadama / Railway Corridor', 'Expansion zone covering Railway station, Fadama markets and surrounding commerce', ST_SetSRID(ST_MakePoint(9.8300, 10.3300), 4326)::geography, 5000, TRUE),
      ('DASS_CORRIDOR', 'Dass Road Corridor', 'Secondary expansion corridor along Dass Road connecting outlying artisan clusters', ST_SetSRID(ST_MakePoint(9.7900, 10.2500), 4326)::geography, 6000, TRUE)
    ON CONFLICT (code) DO NOTHING;

    -- Rider dual-path fields
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

    UPDATE public.riders r
    SET registered_phone_number = u.phone_number
    FROM public.users u
    WHERE u.id = r.user_id AND r.registered_phone_number IS NULL AND u.phone_number IS NOT NULL;

    UPDATE public.riders
    SET service_zone_id = (SELECT id FROM public.service_zones WHERE code = 'GWALLAMEJI_YELWA' LIMIT 1)
    WHERE service_zone_id IS NULL;

    -- Double-entry financial ledger
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

    -- Business wallets
    CREATE TABLE IF NOT EXISTS public.business_wallets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
      current_balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_business_wallets_business_id ON public.business_wallets(business_id);

    INSERT INTO public.business_wallets (business_id)
    SELECT id FROM public.businesses
    ON CONFLICT (business_id) DO NOTHING;

    -- Platform configuration
    CREATE TABLE IF NOT EXISTS public.platform_configurations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key VARCHAR(80) UNIQUE NOT NULL,
      value JSONB NOT NULL,
      description TEXT,
      updated_by UUID REFERENCES public.users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    INSERT INTO public.platform_configurations (key, value, description)
    VALUES
      ('customer_fee_target', '{"amount": 120, "min": 100, "max": 150, "currency": "NGN"}'::jsonb, 'Pilot customer service fee target in NGN'),
      ('merchant_commission_rate', '{"rate": 0.10, "minRate": 0.05, "maxRate": 0.20}'::jsonb, 'Standard merchant commission rate (e.g. 10%)'),
      ('delivery_pricing_tiers', '{"baseFee": 350, "perKmRate": 50, "minimumPayout": 300, "riderSharePercent": 80}'::jsonb, 'Delivery pricing tiers and rider payout share'),
      ('gateway_cost_assumptions', '{"percentageRate": 0.015, "capAmount": 2000, "flatFee": 0}'::jsonb, 'Gateway processing transaction cost assumptions')
    ON CONFLICT (key) DO NOTHING;

    -- Elevate main admin to SUPER_ADMIN
    UPDATE public.users
    SET role = 'SUPER_ADMIN', updated_at = NOW()
    WHERE email = 'contact.squadlink@gmail.com' AND role <> 'SUPER_ADMIN';
  `);
}
