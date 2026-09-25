import { db } from "./database";

export async function ensureWorkflowSchema(): Promise<void> {
  await db.query(`
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
  `);
}
