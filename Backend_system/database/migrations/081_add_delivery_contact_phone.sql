ALTER TABLE public.orders
  ADD COLUMN delivery_contact_phone VARCHAR(30);

ALTER TABLE public.orders
  ADD CONSTRAINT chk_orders_delivery_contact_phone
  CHECK (
    delivery_contact_phone IS NULL
    OR delivery_contact_phone ~ '^\+[1-9][0-9]{7,14}$'
  );
