-- Add subscription_status to organizations for tracking team billing state
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active'
CHECK (subscription_status IN ('active', 'past_due', 'cancelled'));

COMMENT ON COLUMN organizations.subscription_status IS 'Status of the team subscription: active, past_due, or cancelled';
