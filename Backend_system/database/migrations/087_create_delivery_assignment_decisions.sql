CREATE TYPE public.delivery_assignment_decision_status AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED'
);

CREATE TABLE public.delivery_assignment_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL,
  rider_id UUID NOT NULL,
  status public.delivery_assignment_decision_status NOT NULL DEFAULT 'PENDING',
  reason TEXT,
  decided_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_assignment_decisions_delivery
    FOREIGN KEY (delivery_id) REFERENCES public.deliveries(id) ON DELETE RESTRICT,
  CONSTRAINT fk_assignment_decisions_rider
    FOREIGN KEY (rider_id) REFERENCES public.riders(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_pending_assignment_decision
  ON public.delivery_assignment_decisions(delivery_id)
  WHERE status = 'PENDING';

CREATE INDEX idx_assignment_decisions_rider_id
  ON public.delivery_assignment_decisions(rider_id);