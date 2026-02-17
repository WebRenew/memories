-- Track deprecated legacy route usage so sunset/removal can be gated on real traffic.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.legacy_route_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT NOT NULL,
  successor_route TEXT NOT NULL,
  method TEXT NOT NULL,
  status INTEGER NOT NULL CHECK (status >= 100 AND status <= 599),
  was_success BOOLEAN NOT NULL DEFAULT false,
  auth_mode TEXT NOT NULL DEFAULT 'unknown',
  owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  request_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT legacy_route_usage_events_method_check CHECK (method IN ('GET', 'POST', 'DELETE')),
  CONSTRAINT legacy_route_usage_events_auth_mode_check CHECK (auth_mode IN ('session', 'api_key', 'unknown'))
);

CREATE INDEX IF NOT EXISTS idx_legacy_route_usage_events_route_created_at
  ON public.legacy_route_usage_events(route, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_legacy_route_usage_events_created_at
  ON public.legacy_route_usage_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_legacy_route_usage_events_success_created_at
  ON public.legacy_route_usage_events(was_success, created_at DESC);

ALTER TABLE public.legacy_route_usage_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'legacy_route_usage_events'
      AND policyname = 'Service role full access legacy route usage events'
  ) THEN
    CREATE POLICY "Service role full access legacy route usage events"
      ON public.legacy_route_usage_events FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;
