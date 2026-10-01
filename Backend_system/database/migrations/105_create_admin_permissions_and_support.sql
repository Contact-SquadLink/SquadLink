-- Migration 105: Create Admin Permissions & Operational Support Issues
-- Implements granular RBAC permissions for Admin Center and Super Admin Dashboard
-- Supports operational issues and support interventions

CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission VARCHAR(60) NOT NULL,
  granted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_admin_permission UNIQUE (user_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_user_id ON public.admin_permissions(user_id);

CREATE TABLE IF NOT EXISTS public.operational_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  issue_type VARCHAR(60) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assigned_admin_id UUID REFERENCES public.users(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operational_issues_status ON public.operational_issues(status);
CREATE INDEX IF NOT EXISTS idx_operational_issues_order_id ON public.operational_issues(order_id);
