-- Allow users to add themselves as owner when they create an organization
-- This solves the chicken-and-egg problem where:
-- 1. User creates org (works: owner_id = auth.uid())
-- 2. User needs to add themselves as org_member (was blocked by existing policy)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_members'
      AND policyname = 'Users can add themselves as owner to their new orgs'
  ) THEN
    CREATE POLICY "Users can add themselves as owner to their new orgs"
    ON org_members
    FOR INSERT
    WITH CHECK (
      user_id = auth.uid()
      AND role = 'owner'
      AND org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
    );
  END IF;
END
$$;
