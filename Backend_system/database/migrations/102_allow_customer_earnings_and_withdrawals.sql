-- Migration 102: Allow CUSTOMER earnings and nullable delivery/order for general wallet credits
ALTER TYPE public.earning_recipient_type ADD VALUE IF NOT EXISTS 'CUSTOMER';

ALTER TABLE public.earning_transactions ALTER COLUMN delivery_id DROP NOT NULL;
ALTER TABLE public.earning_transactions ALTER COLUMN order_id DROP NOT NULL;
