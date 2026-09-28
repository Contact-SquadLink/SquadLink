-- Migration 100: Isolate Account Push Subscriptions & Preferences
-- Allows multiple accounts on the same device/browser to have independent push subscriptions
-- and notification controls without collisions or mutual unsubscriptions.

-- 1. Drop the legacy single-endpoint unique constraint if it exists
ALTER TABLE public.push_subscriptions
    DROP CONSTRAINT IF EXISTS push_subscriptions_endpoint_key;

-- 2. Drop constraint uq_push_subscriptions_user_endpoint if it already exists (idempotent)
ALTER TABLE public.push_subscriptions
    DROP CONSTRAINT IF EXISTS uq_push_subscriptions_user_endpoint;

-- 3. Add composite unique constraint per account and endpoint
ALTER TABLE public.push_subscriptions
    ADD CONSTRAINT uq_push_subscriptions_user_endpoint UNIQUE (user_id, endpoint);

-- 4. Add account-level notifications toggle to users table if not already present
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- 5. Ensure index on user_id and is_active for fast lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active
    ON public.push_subscriptions(user_id, is_active);

-- 6. Update push delivery trigger to check user notification preferences
CREATE OR REPLACE FUNCTION public.enqueue_notification_push_deliveries()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.channel = 'IN_APP'
       AND NEW.status = 'SENT'
       AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.notification_push_deliveries (notification_id, subscription_id)
        SELECT NEW.id, subscriptions.id
        FROM public.push_subscriptions subscriptions
        INNER JOIN public.users u ON u.id = subscriptions.user_id
        WHERE subscriptions.user_id = NEW.user_id
          AND subscriptions.is_active = TRUE
          AND u.notifications_enabled = TRUE
        ON CONFLICT (notification_id, subscription_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;
