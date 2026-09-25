ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS business_fee_amount BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD CONSTRAINT chk_orders_business_fee
  CHECK (business_fee_amount >= 0)
  NOT VALID;

UPDATE public.schema_migrations
SET name = 'add_business_fee_to_orders'
WHERE version = '096';

INSERT INTO public.schema_migrations (version, name)
VALUES ('096', 'add_business_fee_to_orders')
ON CONFLICT (version) DO NOTHING;