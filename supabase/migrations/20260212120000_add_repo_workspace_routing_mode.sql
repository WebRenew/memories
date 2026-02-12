ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS repo_workspace_routing_mode TEXT NOT NULL DEFAULT 'auto';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_repo_workspace_routing_mode_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_repo_workspace_routing_mode_check
      CHECK (repo_workspace_routing_mode IN ('auto', 'active_workspace'));
  END IF;
END $$;
