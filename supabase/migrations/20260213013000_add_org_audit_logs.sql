-- Organization audit event trail (security and change visibility).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.org_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  target_label TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_audit_logs_org_created_at
  ON public.org_audit_logs (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_audit_logs_org_action_created_at
  ON public.org_audit_logs (org_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_audit_logs_actor_created_at
  ON public.org_audit_logs (actor_user_id, created_at DESC)
  WHERE actor_user_id IS NOT NULL;

ALTER TABLE public.org_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_audit_logs'
      AND policyname = 'Org members can read org audit logs'
  ) THEN
    CREATE POLICY "Org members can read org audit logs"
      ON public.org_audit_logs FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.org_members m
          WHERE m.org_id = org_audit_logs.org_id
            AND m.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_audit_logs'
      AND policyname = 'Service role full access org audit logs'
  ) THEN
    CREATE POLICY "Service role full access org audit logs"
      ON public.org_audit_logs FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;
