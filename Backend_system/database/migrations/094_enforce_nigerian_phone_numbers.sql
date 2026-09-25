ALTER TABLE public.users
  ADD CONSTRAINT chk_users_phone_number_ng
  CHECK (phone_number IS NULL OR phone_number ~ '^\+234[0-9]{10}$')
  NOT VALID;

ALTER TABLE public.businesses
  ADD CONSTRAINT chk_businesses_phone_number_ng
  CHECK (phone_number IS NULL OR phone_number ~ '^\+234[0-9]{10}$')
  NOT VALID;

ALTER TABLE public.orders
  ADD CONSTRAINT chk_orders_delivery_contact_phone_ng
  CHECK (delivery_contact_phone IS NULL OR delivery_contact_phone ~ '^\+234[0-9]{10}$')
  NOT VALID;
