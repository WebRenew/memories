-- Add organization-level Turso credentials so teams can share a single memory DB.
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS turso_db_url TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS turso_db_token TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS turso_db_name TEXT;

-- Track the active organization selection per user.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS current_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_current_org_id ON public.users(current_org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_turso_db_name_unique
  ON public.organizations(turso_db_name)
  WHERE turso_db_name IS NOT NULL;
