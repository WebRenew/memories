-- Canonical pricing model + growth metering support.
-- Adds plan compatibility constraints, tenant billing owner columns, and
-- idempotent Stripe meter-event persistence.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- Plan constraints (keep legacy values during migration for compatibility)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('free', 'pro', 'individual', 'team', 'growth', 'enterprise', 'past_due'));

ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_plan_check;
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_plan_check
  CHECK (plan IN ('free', 'pro', 'individual', 'team', 'growth', 'enterprise', 'past_due'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Tenant routing billing ownership columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.sdk_tenant_databases
  ADD COLUMN IF NOT EXISTS billing_owner_type TEXT NOT NULL DEFAULT 'user';

ALTER TABLE public.sdk_tenant_databases
  ADD COLUMN IF NOT EXISTS billing_owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.sdk_tenant_databases
  ADD COLUMN IF NOT EXISTS billing_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.sdk_tenant_databases
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE public.sdk_tenant_databases DROP CONSTRAINT IF EXISTS sdk_tenant_databases_billing_owner_type_check;
ALTER TABLE public.sdk_tenant_databases
  ADD CONSTRAINT sdk_tenant_databases_billing_owner_type_check
  CHECK (billing_owner_type IN ('user', 'organization'));

CREATE INDEX IF NOT EXISTS idx_sdk_tenant_databases_stripe_customer_id
  ON public.sdk_tenant_databases (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sdk_tenant_databases_billing_owner_user_id
  ON public.sdk_tenant_databases (billing_owner_user_id)
  WHERE billing_owner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sdk_tenant_databases_billing_org_id
  ON public.sdk_tenant_databases (billing_org_id)
  WHERE billing_org_id IS NOT NULL;

-- Backfill billing ownership from the API-key owner where possible.
UPDATE public.sdk_tenant_databases AS db
SET
  billing_owner_type = 'user',
  billing_owner_user_id = u.id,
  stripe_customer_id = COALESCE(db.stripe_customer_id, u.stripe_customer_id)
FROM public.users AS u
WHERE u.mcp_api_key_hash = db.api_key_hash
  AND db.billing_owner_user_id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Growth metering events (idempotent monthly tenant records)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sdk_project_meter_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_customer_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  usage_month DATE NOT NULL,
  owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  owner_type TEXT NOT NULL DEFAULT 'user',
  owner_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  api_key_hash TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_identifier TEXT NOT NULL UNIQUE,
  value INTEGER NOT NULL DEFAULT 1 CHECK (value > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  stripe_reported_at TIMESTAMPTZ,
  stripe_last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sdk_project_meter_events_owner_type_check
    CHECK (owner_type IN ('user', 'organization')),
  CONSTRAINT sdk_project_meter_events_tenant_id_non_empty
    CHECK (char_length(trim(tenant_id)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sdk_project_meter_events_customer_tenant_month_unique
  ON public.sdk_project_meter_events (stripe_customer_id, tenant_id, usage_month);

CREATE INDEX IF NOT EXISTS idx_sdk_project_meter_events_api_key_hash
  ON public.sdk_project_meter_events (api_key_hash);

CREATE INDEX IF NOT EXISTS idx_sdk_project_meter_events_usage_month
  ON public.sdk_project_meter_events (usage_month);

CREATE INDEX IF NOT EXISTS idx_sdk_project_meter_events_stripe_reported_at
  ON public.sdk_project_meter_events (stripe_reported_at);

ALTER TABLE public.sdk_project_meter_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sdk_project_meter_events'
      AND policyname = 'Service role full access sdk_project_meter_events'
  ) THEN
    CREATE POLICY "Service role full access sdk_project_meter_events"
      ON public.sdk_project_meter_events
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END;
$$;
