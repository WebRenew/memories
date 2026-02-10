-- API-key + tenant routing table for SaaS customer-level Turso isolation.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.sdk_tenant_databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_hash TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  turso_db_url TEXT NOT NULL,
  turso_db_token TEXT NOT NULL,
  turso_db_name TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_verified_at TIMESTAMPTZ,
  CONSTRAINT sdk_tenant_databases_status_check
    CHECK (status IN ('provisioning', 'ready', 'disabled', 'error')),
  CONSTRAINT sdk_tenant_databases_tenant_id_non_empty
    CHECK (char_length(trim(tenant_id)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sdk_tenant_databases_api_key_tenant_unique
  ON public.sdk_tenant_databases (api_key_hash, tenant_id);

CREATE INDEX IF NOT EXISTS idx_sdk_tenant_databases_api_key_hash
  ON public.sdk_tenant_databases (api_key_hash);

CREATE INDEX IF NOT EXISTS idx_sdk_tenant_databases_status
  ON public.sdk_tenant_databases (status);

ALTER TABLE public.sdk_tenant_databases ENABLE ROW LEVEL SECURITY;
