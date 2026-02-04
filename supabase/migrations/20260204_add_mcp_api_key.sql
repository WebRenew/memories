-- Add MCP API key for hosted MCP server access
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mcp_api_key TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_mcp_api_key ON public.users(mcp_api_key);
