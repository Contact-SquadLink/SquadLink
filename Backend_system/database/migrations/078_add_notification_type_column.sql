ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS type public.notification_type;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.notifications
        WHERE type IS NULL
    ) THEN
        RAISE EXCEPTION
            'Cannot make notifications.type NOT NULL while existing rows have no notification type.';
    END IF;
END
$$;

ALTER TABLE public.notifications
ALTER COLUMN type SET NOT NULL;
