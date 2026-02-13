-- Scoped references to Supabase Vault secrets for optional integration config sync.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.integration_secret_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_owner_type TEXT NOT NULL CHECK (target_owner_type IN ('user', 'organization')),
  target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  target_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'project')),
  project_id TEXT,
  integration TEXT NOT NULL,
  config_path TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  vault_secret_id UUID NOT NULL,
  vault_secret_name TEXT NOT NULL,
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT integration_secret_refs_target_workspace_check CHECK (
    (target_owner_type = 'user' AND target_user_id IS NOT NULL AND target_org_id IS NULL)
    OR
    (target_owner_type = 'organization' AND target_org_id IS NOT NULL AND target_user_id IS NULL)
  ),
  CONSTRAINT integration_secret_refs_scope_project_check CHECK (
    (scope = 'global' AND project_id IS NULL)
    OR
    (scope = 'project' AND project_id IS NOT NULL AND char_length(trim(project_id)) > 0)
  ),
  CONSTRAINT integration_secret_refs_non_empty_fields_check CHECK (
    char_length(trim(integration)) > 0
    AND char_length(trim(config_path)) > 0
    AND char_length(trim(secret_key)) > 0
    AND char_length(trim(vault_secret_name)) > 0
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_secret_refs_unique_lookup
  ON public.integration_secret_refs (
    target_owner_type,
    COALESCE(target_user_id::text, ''),
    COALESCE(target_org_id::text, ''),
    scope,
    COALESCE(project_id, ''),
    integration,
    config_path,
    secret_key
  );

CREATE INDEX IF NOT EXISTS idx_integration_secret_refs_user_lookup
  ON public.integration_secret_refs (target_user_id, scope, project_id, integration, config_path)
  WHERE target_owner_type = 'user' AND target_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integration_secret_refs_org_lookup
  ON public.integration_secret_refs (target_org_id, scope, project_id, integration, config_path)
  WHERE target_owner_type = 'organization' AND target_org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integration_secret_refs_vault_secret_id
  ON public.integration_secret_refs (vault_secret_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_integration_secret_refs_updated') THEN
      CREATE TRIGGER on_integration_secret_refs_updated
        BEFORE UPDATE ON public.integration_secret_refs
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
  END IF;
END
$$;

ALTER TABLE public.integration_secret_refs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'integration_secret_refs'
      AND policyname = 'Users can manage own integration secret refs'
  ) THEN
    CREATE POLICY "Users can manage own integration secret refs"
      ON public.integration_secret_refs FOR ALL
      USING (
        target_owner_type = 'user'
        AND target_user_id = auth.uid()
      )
      WITH CHECK (
        target_owner_type = 'user'
        AND target_user_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'integration_secret_refs'
      AND policyname = 'Org admins can manage org integration secret refs'
  ) THEN
    CREATE POLICY "Org admins can manage org integration secret refs"
      ON public.integration_secret_refs FOR ALL
      USING (
        target_owner_type = 'organization'
        AND EXISTS (
          SELECT 1
          FROM public.org_members m
          WHERE m.org_id = integration_secret_refs.target_org_id
            AND m.user_id = auth.uid()
            AND m.role IN ('owner', 'admin')
        )
      )
      WITH CHECK (
        target_owner_type = 'organization'
        AND EXISTS (
          SELECT 1
          FROM public.org_members m
          WHERE m.org_id = integration_secret_refs.target_org_id
            AND m.user_id = auth.uid()
            AND m.role IN ('owner', 'admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'integration_secret_refs'
      AND policyname = 'Service role full access integration secret refs'
  ) THEN
    CREATE POLICY "Service role full access integration secret refs"
      ON public.integration_secret_refs FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.files_vault_create_secret(
  p_secret TEXT,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id UUID;
  v_name TEXT := NULLIF(trim(COALESCE(p_name, '')), '');
  v_description TEXT := NULLIF(trim(COALESCE(p_description, '')), '');
BEGIN
  IF p_secret IS NULL OR char_length(p_secret) = 0 THEN
    RAISE EXCEPTION 'p_secret is required';
  END IF;

  IF to_regnamespace('vault') IS NULL THEN
    RAISE EXCEPTION 'Supabase Vault schema is not enabled';
  END IF;

  BEGIN
    EXECUTE 'SELECT vault.create_secret($1, $2, $3)'
      INTO v_secret_id
      USING p_secret, v_name, v_description;
  EXCEPTION
    WHEN undefined_function OR invalid_schema_name THEN
      RAISE EXCEPTION 'Supabase Vault extension is not available';
  END;

  IF v_secret_id IS NULL THEN
    RAISE EXCEPTION 'Vault secret creation failed';
  END IF;

  RETURN v_secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.files_vault_update_secret(
  p_secret_id UUID,
  p_secret TEXT,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_name TEXT := NULLIF(trim(COALESCE(p_name, '')), '');
  v_description TEXT := NULLIF(trim(COALESCE(p_description, '')), '');
BEGIN
  IF p_secret_id IS NULL THEN
    RAISE EXCEPTION 'p_secret_id is required';
  END IF;

  IF p_secret IS NULL OR char_length(p_secret) = 0 THEN
    RAISE EXCEPTION 'p_secret is required';
  END IF;

  IF to_regnamespace('vault') IS NULL THEN
    RAISE EXCEPTION 'Supabase Vault schema is not enabled';
  END IF;

  BEGIN
    EXECUTE 'SELECT vault.update_secret($1, $2, $3, $4)'
      USING p_secret_id, p_secret, v_name, v_description;
  EXCEPTION
    WHEN undefined_function OR invalid_schema_name THEN
      RAISE EXCEPTION 'Supabase Vault extension is not available';
  END;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.files_vault_read_secret(
  p_secret_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  IF p_secret_id IS NULL THEN
    RAISE EXCEPTION 'p_secret_id is required';
  END IF;

  IF to_regnamespace('vault') IS NULL THEN
    RAISE EXCEPTION 'Supabase Vault schema is not enabled';
  END IF;

  BEGIN
    EXECUTE 'SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.id = $1'
      INTO v_secret
      USING p_secret_id;
  EXCEPTION
    WHEN undefined_table OR undefined_column OR invalid_schema_name THEN
      RAISE EXCEPTION 'Supabase Vault extension is not available';
  END;

  RETURN v_secret;
END;
$$;

REVOKE ALL ON FUNCTION public.files_vault_create_secret(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.files_vault_update_secret(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.files_vault_read_secret(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.files_vault_create_secret(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.files_vault_update_secret(UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.files_vault_read_secret(UUID) TO service_role;
