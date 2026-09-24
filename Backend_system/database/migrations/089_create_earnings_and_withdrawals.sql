CREATE TYPE public.earning_recipient_type AS ENUM ('RIDER', 'BUSINESS');
CREATE TYPE public.withdrawal_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');

CREATE TABLE public.earning_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL,
  recipient_type public.earning_recipient_type NOT NULL,
  delivery_id UUID NOT NULL,
  order_id UUID NOT NULL,
  amount BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_earning_transactions_user FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_earning_transactions_delivery FOREIGN KEY (delivery_id) REFERENCES public.deliveries(id) ON DELETE RESTRICT,
  CONSTRAINT fk_earning_transactions_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT,
  CONSTRAINT chk_earning_transactions_amount CHECK (amount > 0)
);

CREATE UNIQUE INDEX uq_earning_transactions_delivery_recipient
  ON public.earning_transactions(delivery_id, recipient_user_id, recipient_type);

CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  status public.withdrawal_status NOT NULL DEFAULT 'PENDING',
  payout_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_withdrawal_requests_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_withdrawal_requests_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_withdrawal_requests_amount CHECK (amount > 0)
);

CREATE INDEX idx_earning_transactions_recipient ON public.earning_transactions(recipient_user_id, created_at DESC);
CREATE INDEX idx_withdrawal_requests_user ON public.withdrawal_requests(user_id, created_at DESC);
