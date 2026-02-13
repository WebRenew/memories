-- Capture policy controls for GitHub auto-capture (workspace scoped).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.github_capture_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_owner_type TEXT NOT NULL CHECK (target_owner_type IN ('user', 'organization')),
  target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  target_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  allowed_events TEXT[] NOT NULL DEFAULT ARRAY['pull_request', 'issues', 'push', 'release']::text[],
  repo_allow_list TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  repo_block_list TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  branch_filters TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  label_filters TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  actor_filters TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  include_prerelease BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT github_capture_settings_target_workspace_check CHECK (
    (target_owner_type = 'user' AND target_user_id IS NOT NULL AND target_org_id IS NULL)
    OR
    (target_owner_type = 'organization' AND target_org_id IS NOT NULL AND target_user_id IS NULL)
  ),
  CONSTRAINT github_capture_settings_allowed_events_check CHECK (
    cardinality(allowed_events) > 0
    AND allowed_events <@ ARRAY['pull_request', 'issues', 'push', 'release']::text[]
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_github_capture_settings_user_unique
  ON public.github_capture_settings (target_owner_type, target_user_id)
  WHERE target_owner_type = 'user' AND target_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_github_capture_settings_org_unique
  ON public.github_capture_settings (target_owner_type, target_org_id)
  WHERE target_owner_type = 'organization' AND target_org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_github_capture_settings_target_user
  ON public.github_capture_settings (target_user_id)
  WHERE target_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_github_capture_settings_target_org
  ON public.github_capture_settings (target_org_id)
  WHERE target_org_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_github_capture_settings_updated') THEN
      CREATE TRIGGER on_github_capture_settings_updated
        BEFORE UPDATE ON public.github_capture_settings
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
  END IF;
END
$$;

ALTER TABLE public.github_capture_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'github_capture_settings'
      AND policyname = 'Users can manage own github capture settings'
  ) THEN
    CREATE POLICY "Users can manage own github capture settings"
      ON public.github_capture_settings FOR ALL
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
      AND tablename = 'github_capture_settings'
      AND policyname = 'Org admins can manage org github capture settings'
  ) THEN
    CREATE POLICY "Org admins can manage org github capture settings"
      ON public.github_capture_settings FOR ALL
      USING (
        target_owner_type = 'organization'
        AND EXISTS (
          SELECT 1
          FROM public.org_members m
          WHERE m.org_id = github_capture_settings.target_org_id
            AND m.user_id = auth.uid()
            AND m.role IN ('owner', 'admin')
        )
      )
      WITH CHECK (
        target_owner_type = 'organization'
        AND EXISTS (
          SELECT 1
          FROM public.org_members m
          WHERE m.org_id = github_capture_settings.target_org_id
            AND m.user_id = auth.uid()
            AND m.role IN ('owner', 'admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'github_capture_settings'
      AND policyname = 'Service role full access github capture settings'
  ) THEN
    CREATE POLICY "Service role full access github capture settings"
      ON public.github_capture_settings FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;
