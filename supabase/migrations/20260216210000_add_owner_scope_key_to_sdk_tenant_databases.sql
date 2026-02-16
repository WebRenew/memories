-- Decouple tenant mapping identity from rotating API key hashes.
-- Use a stable billing owner scope key: org:<org_id> or user:<user_id>.

ALTER TABLE public.sdk_tenant_databases
  ADD COLUMN IF NOT EXISTS owner_scope_key TEXT;

-- Backfill from explicit billing ownership first.
UPDATE public.sdk_tenant_databases
SET owner_scope_key = CASE
  WHEN billing_owner_type = 'organization' AND billing_org_id IS NOT NULL THEN 'org:' || billing_org_id::text
  WHEN billing_owner_user_id IS NOT NULL THEN 'user:' || billing_owner_user_id::text
  WHEN created_by_user_id IS NOT NULL THEN 'user:' || created_by_user_id::text
  ELSE owner_scope_key
END
WHERE owner_scope_key IS NULL;

-- Backfill remaining rows via API key owner lookup.
UPDATE public.sdk_tenant_databases AS db
SET owner_scope_key = 'user:' || u.id::text
FROM public.users AS u
WHERE db.owner_scope_key IS NULL
  AND db.api_key_hash = u.mcp_api_key_hash;

-- Final deterministic fallbacks (should be rare) to keep the migration non-blocking.
UPDATE public.sdk_tenant_databases
SET owner_scope_key = 'legacy-api-key:' || api_key_hash
WHERE owner_scope_key IS NULL
  AND api_key_hash IS NOT NULL;

UPDATE public.sdk_tenant_databases
SET owner_scope_key = 'legacy-row:' || id::text
WHERE owner_scope_key IS NULL;

-- Deduplicate historical key-rotation copies by owner scope + tenant.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY owner_scope_key, tenant_id
      ORDER BY
        CASE WHEN status = 'ready' THEN 0 ELSE 1 END,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id DESC
    ) AS row_rank
  FROM public.sdk_tenant_databases
)
DELETE FROM public.sdk_tenant_databases AS db
USING ranked
WHERE db.id = ranked.id
  AND ranked.row_rank > 1;

ALTER TABLE public.sdk_tenant_databases
  ALTER COLUMN owner_scope_key SET NOT NULL;

ALTER TABLE public.sdk_tenant_databases
  DROP CONSTRAINT IF EXISTS sdk_tenant_databases_owner_scope_key_non_empty;

ALTER TABLE public.sdk_tenant_databases
  ADD CONSTRAINT sdk_tenant_databases_owner_scope_key_non_empty
  CHECK (char_length(trim(owner_scope_key)) > 0);

DROP INDEX IF EXISTS idx_sdk_tenant_databases_api_key_tenant_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sdk_tenant_databases_owner_scope_tenant_unique
  ON public.sdk_tenant_databases (owner_scope_key, tenant_id);

CREATE INDEX IF NOT EXISTS idx_sdk_tenant_databases_owner_scope_key
  ON public.sdk_tenant_databases (owner_scope_key);
