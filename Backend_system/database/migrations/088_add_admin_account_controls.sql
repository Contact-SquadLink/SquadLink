ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_deleted_at
  ON public.users(deleted_at);

CREATE INDEX IF NOT EXISTS idx_users_suspended_at
  ON public.users(suspended_at);
