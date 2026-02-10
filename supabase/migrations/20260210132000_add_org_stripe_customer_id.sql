-- Add organization-level Stripe customer ownership for workspace billing.
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Backfill from existing owner billing records when available.
UPDATE public.organizations AS org
SET stripe_customer_id = owner.stripe_customer_id
FROM public.users AS owner
WHERE owner.id = org.owner_id
  AND org.stripe_customer_id IS NULL
  AND owner.stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id_unique
  ON public.organizations(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
