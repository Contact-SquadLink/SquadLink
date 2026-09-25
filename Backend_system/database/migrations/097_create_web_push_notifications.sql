CREATE TABLE public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh_key VARCHAR(255) NOT NULL,
    auth_key VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_push_subscriptions_user
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_push_subscriptions_user_active
    ON public.push_subscriptions(user_id, is_active);

CREATE TABLE public.notification_push_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL,
    subscription_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_notification_push_delivery_notification
        FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_push_delivery_subscription
        FOREIGN KEY (subscription_id) REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
    CONSTRAINT uq_notification_push_delivery
        UNIQUE (notification_id, subscription_id),
    CONSTRAINT chk_notification_push_delivery_status
        CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'EXPIRED')),
    CONSTRAINT chk_notification_push_delivery_attempt_count
        CHECK (attempt_count >= 0)
);

CREATE INDEX idx_notification_push_deliveries_ready
    ON public.notification_push_deliveries(status, available_at, created_at);

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
        WHERE subscriptions.user_id = NEW.user_id
          AND subscriptions.is_active = TRUE
        ON CONFLICT (notification_id, subscription_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enqueue_notification_push_deliveries
AFTER INSERT OR UPDATE OF status ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_notification_push_deliveries();