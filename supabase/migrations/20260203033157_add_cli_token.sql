ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cli_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_cli_token ON public.users(cli_token);
