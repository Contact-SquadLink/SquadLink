import 'dotenv/config';
import { Client } from 'pg';
import { readFile } from 'node:fs/promises';

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  await client.query('BEGIN');

  await client.query(`
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'BUSINESS_APPLICATION_APPROVED';
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'BUSINESS_APPLICATION_REJECTED';
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'RIDER_APPLICATION_APPROVED';
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'RIDER_APPLICATION_REJECTED';
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'RIDER_APPLICATION_SUBMITTED';

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'rider_verification_status') THEN
        CREATE TYPE public.rider_verification_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS public.rider_wallets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rider_id UUID NOT NULL UNIQUE,
      current_balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_rider_wallets_rider FOREIGN KEY (rider_id) REFERENCES public.riders(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_rider_wallets_rider_id ON public.rider_wallets(rider_id);

    CREATE TABLE IF NOT EXISTS public.rider_verifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rider_id UUID NOT NULL UNIQUE,
      status public.rider_verification_status NOT NULL DEFAULT 'PENDING',
      verified_by UUID,
      verification_notes TEXT,
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_rider_verifications_rider FOREIGN KEY (rider_id) REFERENCES public.riders(id) ON DELETE RESTRICT,
      CONSTRAINT fk_rider_verifications_verified_by FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE RESTRICT,
      CONSTRAINT chk_rider_verifications_verified CHECK (status <> 'VERIFIED' OR verified_at IS NOT NULL)
    );
    CREATE INDEX IF NOT EXISTS idx_rider_verifications_status ON public.rider_verifications(status);

    CREATE TABLE IF NOT EXISTS public.rider_verification_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rider_id UUID NOT NULL,
      previous_status public.rider_verification_status,
      new_status public.rider_verification_status NOT NULL,
      reason TEXT,
      changed_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_rider_verification_history_rider FOREIGN KEY (rider_id) REFERENCES public.riders(id) ON DELETE RESTRICT,
      CONSTRAINT fk_rider_verification_history_changed_by FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE RESTRICT
    );
    CREATE INDEX IF NOT EXISTS idx_rider_verification_history_rider_id ON public.rider_verification_history(rider_id);

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'delivery_assignment_decision_status') THEN
        CREATE TYPE public.delivery_assignment_decision_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS public.delivery_assignment_decisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      delivery_id UUID NOT NULL,
      rider_id UUID NOT NULL,
      status public.delivery_assignment_decision_status NOT NULL DEFAULT 'PENDING',
      reason TEXT,
      decided_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_assignment_decisions_delivery FOREIGN KEY (delivery_id) REFERENCES public.deliveries(id) ON DELETE RESTRICT,
      CONSTRAINT fk_assignment_decisions_rider FOREIGN KEY (rider_id) REFERENCES public.riders(id) ON DELETE RESTRICT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_assignment_decision ON public.delivery_assignment_decisions(delivery_id) WHERE status = 'PENDING';
    CREATE INDEX IF NOT EXISTS idx_assignment_decisions_rider_id ON public.delivery_assignment_decisions(rider_id);

    INSERT INTO public.delivery_assignment_decisions (delivery_id, rider_id)
    SELECT d.id, d.rider_id
    FROM public.deliveries d
    WHERE d.status = 'ASSIGNED' AND d.rider_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.delivery_assignment_decisions dad WHERE dad.delivery_id = d.id)
    ON CONFLICT DO NOTHING;

    CREATE TABLE IF NOT EXISTS public.contact_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(120) NOT NULL,
      email VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'NEW',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_contact_messages_status CHECK (status IN ('NEW', 'READ', 'CLOSED'))
    );
    CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);

    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS platform_fee_amount BIGINT NOT NULL DEFAULT 0;
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_platform_fee') THEN
        ALTER TABLE public.orders ADD CONSTRAINT chk_orders_platform_fee CHECK (platform_fee_amount >= 0) NOT VALID;
      END IF;
    END $$;

    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS business_fee_amount BIGINT NOT NULL DEFAULT 0;
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_business_fee') THEN
        ALTER TABLE public.orders ADD CONSTRAINT chk_orders_business_fee CHECK (business_fee_amount >= 0) NOT VALID;
      END IF;
    END $$;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_phone_number_ng') THEN
        ALTER TABLE public.users ADD CONSTRAINT chk_users_phone_number_ng CHECK (phone_number IS NULL OR phone_number ~ '^\\+234[0-9]{10}$') NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_businesses_phone_number_ng') THEN
        ALTER TABLE public.businesses ADD CONSTRAINT chk_businesses_phone_number_ng CHECK (phone_number IS NULL OR phone_number ~ '^\\+234[0-9]{10}$') NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_delivery_contact_phone_ng') THEN
        ALTER TABLE public.orders ADD CONSTRAINT chk_orders_delivery_contact_phone_ng CHECK (delivery_contact_phone IS NULL OR delivery_contact_phone ~ '^\\+234[0-9]{10}$') NOT VALID;
      END IF;
    END $$;
  `);

  await client.query(`
    INSERT INTO public.schema_migrations (version, name) VALUES
      ('086', 'create_rider_verification'),
      ('087', 'create_delivery_assignment_decisions'),
      ('091', 'add_rider_application_submitted_notification'),
      ('092', 'backfill_assignment_decisions'),
      ('093', 'create_contact_messages'),
      ('094', 'enforce_nigerian_phone_numbers'),
      ('095', 'add_platform_fee_to_orders'),
      ('096', 'add_business_fee_to_orders')
    ON CONFLICT (version) DO NOTHING
  `);

  const pushMigration = await client.query(
    "SELECT 1 FROM public.schema_migrations WHERE version = '097'"
  );
  if (pushMigration.rowCount === 0) {
    const pushMigrationSql = await readFile(
      new URL('../database/migrations/097_create_web_push_notifications.sql', import.meta.url),
      'utf8'
    );
    await client.query(pushMigrationSql);
    await client.query(
      "INSERT INTO public.schema_migrations (version, name) VALUES ('097', 'create_web_push_notifications')"
    );
  }

  await client.query('COMMIT');
  console.log('Workflow migrations applied successfully.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  console.error('Workflow migration failed.');
  process.exitCode = 1;
} finally {
  await client.end();
}
