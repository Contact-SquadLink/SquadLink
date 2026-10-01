-- Migration 104: Add Order Economic Snapshot and Delivery Waiting Metrics
-- Stores complete historical snapshot of pricing, fuel, operational distance, and economic viability.
-- Adds waiting time tracking for rider economics KPI analysis.

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS economic_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.orders.economic_snapshot IS 'Immutable snapshot of all economic and pricing assumptions active at the time the order was created.';

ALTER TABLE public.deliveries
ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS business_wait_minutes NUMERIC(6,2),
ADD COLUMN IF NOT EXISTS customer_wait_minutes NUMERIC(6,2),
ADD COLUMN IF NOT EXISTS total_wait_minutes NUMERIC(6,2);

COMMENT ON COLUMN public.deliveries.business_wait_minutes IS 'Actual or estimated waiting time spent by the rider at the fulfilling merchant for preparation/handoff.';
COMMENT ON COLUMN public.deliveries.customer_wait_minutes IS 'Actual or estimated waiting time spent by the rider at customer location during arrival and handoff.';
COMMENT ON COLUMN public.deliveries.total_wait_minutes IS 'Combined operational waiting duration in minutes.';

CREATE INDEX IF NOT EXISTS idx_orders_economic_snapshot_gin 
ON public.orders USING gin (economic_snapshot);
