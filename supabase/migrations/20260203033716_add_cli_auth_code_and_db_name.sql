ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cli_auth_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS turso_db_name TEXT;
CREATE INDEX IF NOT EXISTS idx_users_cli_auth_code ON public.users(cli_auth_code);
