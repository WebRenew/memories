import { authenticateRequest } from "@/lib/auth"
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeWorkspacePlan } from "@/lib/workspace"
import { NextResponse } from "next/server"

interface UserWorkspaceRow {
  id: string
  plan: string | null
  current_org_id: string | null
  turso_db_url: string | null
  turso_db_token: string | null
}

interface OrganizationWorkspaceRow {
  id: string
  name: string
  slug: string
  plan: string | null
  subscription_status: "active" | "past_due" | "cancelled" | null
  stripe_subscription_id: string | null
  turso_db_url: string | null
  turso_db_token: string | null
}

interface OrgMembershipRow {
  role: "owner" | "admin" | "member"
  organization: OrganizationWorkspaceRow | OrganizationWorkspaceRow[] | null
}

interface WorkspaceSummary {
  ownerType: "user" | "organization"
  orgId: string | null
  orgRole: "owner" | "admin" | "member" | null
  plan: "free" | "pro" | "past_due"
  hasDatabase: boolean
  canProvision: boolean
  canManageBilling: boolean
}

const CACHE_CONTROL_WORKSPACE = "private, max-age=15, stale-while-revalidate=45"

function resolveOrganizationPlan(
  org: OrganizationWorkspaceRow,
  fallbackPlan: string | null
): "free" | "pro" | "past_due" {
  if (org.subscription_status === "past_due") return "past_due"
  if (org.subscription_status === "cancelled") return "free"

  if (org.subscription_status === "active") {
    if (org.stripe_subscription_id) return "pro"
    if (org.plan === "team" || org.plan === "enterprise") return "pro"
  }

  return normalizeWorkspacePlan(org.plan ?? fallbackPlan)
}

function toPersonalSummary(user: UserWorkspaceRow): WorkspaceSummary {
  return {
    ownerType: "user",
    orgId: null,
    orgRole: null,
    plan: normalizeWorkspacePlan(user.plan),
    hasDatabase: Boolean(user.turso_db_url && user.turso_db_token),
    canProvision: true,
    canManageBilling: true,
  }
}

function toOrganizationSummary(
  membership: OrgMembershipRow,
  userPlan: string | null
): WorkspaceSummary | null {
  const organization = Array.isArray(membership.organization)
    ? membership.organization[0] ?? null
    : membership.organization

  if (!organization) return null

  const orgRole = membership.role
  return {
    ownerType: "organization",
    orgId: organization.id,
    orgRole,
    plan: resolveOrganizationPlan(organization, userPlan),
    hasDatabase: Boolean(organization.turso_db_url && organization.turso_db_token),
    canProvision: orgRole === "owner" || orgRole === "admin",
    canManageBilling: orgRole === "owner",
  }
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimited = await checkRateLimit(apiRateLimit, auth.userId)
  if (rateLimited) return rateLimited

  const admin = createAdminClient()
  const { searchParams } = new URL(request.url)
  const includeSummaries =
    searchParams.get("includeSummaries") === "1" ||
    searchParams.get("includeSummaries") === "true"

  const [userResult, membershipsResult] = await Promise.all([
    admin
      .from("users")
      .select("id, plan, current_org_id, turso_db_url, turso_db_token")
      .eq("id", auth.userId)
      .single(),
    admin
      .from("org_members")
      .select(`
        role,
        organization:organizations(
          id,
          name,
          slug,
          plan,
          subscription_status,
          stripe_subscription_id,
          turso_db_url,
          turso_db_token
        )
      `)
      .eq("user_id", auth.userId),
  ])

  if (userResult.error || !userResult.data) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
  }

  if (membershipsResult.error) {
    return NextResponse.json({ error: membershipsResult.error.message }, { status: 500 })
  }

  const userRow = userResult.data as UserWorkspaceRow
  const memberships = (membershipsResult.data ?? []) as OrgMembershipRow[]
  const personal = toPersonalSummary(userRow)

  const organizationSummaries = memberships
    .map((membership) => {
      const organization = Array.isArray(membership.organization)
        ? membership.organization[0] ?? null
        : membership.organization
      const workspace = toOrganizationSummary(membership, userRow.plan)
      if (!organization || !workspace) return null

      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        role: membership.role,
        workspace,
      }
    })
    .filter(Boolean) as Array<{
    id: string
    name: string
    slug: string
    role: "owner" | "admin" | "member"
    workspace: WorkspaceSummary
  }>

  const activeOrganization = organizationSummaries.find(
    (item) => item.id === userRow.current_org_id
  )

  const responseBody: {
    workspace: WorkspaceSummary
    summaries?: {
      currentOrgId: string | null
      personal: WorkspaceSummary
      organizations: Array<{
        id: string
        name: string
        slug: string
        role: "owner" | "admin" | "member"
        workspace: WorkspaceSummary
      }>
    }
  } = {
    workspace: activeOrganization?.workspace ?? personal,
  }

  if (includeSummaries) {
    responseBody.summaries = {
      currentOrgId: userRow.current_org_id,
      personal,
      organizations: organizationSummaries,
    }
  }

  return NextResponse.json(responseBody, {
    headers: {
      "Cache-Control": CACHE_CONTROL_WORKSPACE,
    },
  })
}
