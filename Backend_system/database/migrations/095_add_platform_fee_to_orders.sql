ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS platform_fee_amount BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD CONSTRAINT chk_orders_platform_fee
  CHECK (platform_fee_amount >= 0)
  NOT VALID;

UPDATE public.schema_migrations
SET name = 'add_platform_fee_to_orders'
WHERE version = '095';

INSERT INTO public.schema_migrations (version, name)
VALUES ('095', 'add_platform_fee_to_orders')
ON CONFLICT (version) DO NOTHING;
