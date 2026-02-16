type RepoWorkspaceRoutingMode = "auto" | "active_workspace"

interface UserMemoryRow {
  id: string
  current_org_id: string | null
  plan: string | null
  turso_db_url: string | null
  turso_db_token: string | null
  turso_db_name: string | null
  repo_workspace_routing_mode?: RepoWorkspaceRoutingMode | null
}

type OrgSubscriptionStatus = "active" | "past_due" | "cancelled" | null

interface OrganizationMemoryRow {
  id: string
  slug: string | null
  plan: string | null
  subscription_status: OrgSubscriptionStatus
  stripe_subscription_id: string | null
  turso_db_url: string | null
  turso_db_token: string | null
  turso_db_name: string | null
}

interface OrgMembershipRow {
  role: "owner" | "admin" | "member"
}

export interface ActiveMemoryContext {
  ownerType: "user" | "organization"
  userId: string
  orgId: string | null
  orgRole: OrgMembershipRow["role"] | null
  plan: string | null
  turso_db_url: string | null
  turso_db_token: string | null
  turso_db_name: string | null
}

export interface ResolveActiveMemoryContextOptions {
  // If false, keeps organization context even when organization credentials are missing.
  fallbackToUserWithoutOrgCredentials?: boolean
  // Optional project identifier (e.g. github.com/acme/repo) used for repo-aware workspace routing.
  projectId?: string | null
}

function toUserContext(user: UserMemoryRow): ActiveMemoryContext {
  return {
    ownerType: "user",
    userId: user.id,
    orgId: null,
    orgRole: null,
    plan: normalizeUserPlan(user.plan),
    turso_db_url: user.turso_db_url,
    turso_db_token: user.turso_db_token,
    turso_db_name: user.turso_db_name,
  }
}

function normalizeUserPlan(plan: string | null | undefined): string {
  if (plan === "past_due") return "past_due"
  if (plan === "growth" || plan === "enterprise") return "growth"
  if (plan === "team") return "team"
  if (plan === "individual" || plan === "pro") return "individual"
  return "free"
}

function normalizeOrganizationActivePlan(plan: string | null | undefined): string {
  if (plan === "growth" || plan === "enterprise") return "growth"
  if (plan === "team" || plan === "pro" || plan === "individual") return "team"
  return "team"
}

function resolveOrganizationPlan(
  org: OrganizationMemoryRow,
  fallbackPlan: string | null
): string | null {
  if (org.subscription_status === "past_due") {
    return "past_due"
  }

  if (org.subscription_status === "cancelled") {
    return "free"
  }

  if (org.subscription_status === "active") {
    if (org.plan) {
      return normalizeOrganizationActivePlan(org.plan)
    }
    if (org.stripe_subscription_id) {
      return "team"
    }
  }

  if (org.plan) {
    return normalizeUserPlan(org.plan)
  }

  return normalizeUserPlan(fallbackPlan)
}

function normalizeRoutingMode(value: string | null | undefined): RepoWorkspaceRoutingMode {
  return value === "active_workspace" ? "active_workspace" : "auto"
}

function parseGithubOwner(projectId: string | null | undefined): string | null {
  const raw = projectId?.trim()
  if (!raw) return null

  const normalized = raw
    .replace(/^https?:\/\//i, "")
    .replace(/^git@github\.com:/i, "github.com/")
    .replace(/\.git$/i, "")
    .toLowerCase()

  const parts = normalized.split("/").filter(Boolean)
  if (parts.length < 3 || parts[0] !== "github.com") return null
  return parts[1] || null
}

function isMissingColumnError(error: unknown, columnName: string): boolean {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "").toLowerCase()
      : ""

  return (
    message.includes("column") &&
    message.includes(columnName.toLowerCase()) &&
    message.includes("does not exist")
  )
}

export async function resolveActiveMemoryContext(
  client: unknown,
  userId: string,
  options: ResolveActiveMemoryContextOptions = {}
): Promise<ActiveMemoryContext | null> {
  const supabase = client as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {
            single: () => Promise<{ data: unknown; error: unknown }>
          }
          single: () => Promise<{ data: unknown; error: unknown }>
        }
      }
    }
  }

  const fallbackToUserWithoutOrgCredentials =
    options.fallbackToUserWithoutOrgCredentials ?? false

  let { data: userData, error: userError } = await supabase
    .from("users")
    .select(
      "id, current_org_id, plan, turso_db_url, turso_db_token, turso_db_name, repo_workspace_routing_mode"
    )
    .eq("id", userId)
    .single()

  if (userError && isMissingColumnError(userError, "repo_workspace_routing_mode")) {
    const fallback = await supabase
      .from("users")
      .select("id, current_org_id, plan, turso_db_url, turso_db_token, turso_db_name")
      .eq("id", userId)
      .single()
    userData = fallback.data
    userError = fallback.error
  }

  if (userError || !userData) {
    return null
  }

  const user = userData as UserMemoryRow
  const userContext = toUserContext(user)
  const routingMode = normalizeRoutingMode(user.repo_workspace_routing_mode)
  const projectOwner = parseGithubOwner(options.projectId)

  // Default behavior: repo-scoped memories route by GitHub owner.
  // If owner matches an org slug this user belongs to, route to org workspace.
  // Otherwise route to personal workspace.
  if (routingMode === "auto" && options.projectId?.trim()) {
    if (!projectOwner) {
      return userContext
    }

    const { data: orgBySlugData, error: orgBySlugError } = await supabase
      .from("organizations")
      .select(
        "id, slug, plan, subscription_status, stripe_subscription_id, turso_db_url, turso_db_token, turso_db_name"
      )
      .eq("slug", projectOwner)
      .single()

    if (orgBySlugError || !orgBySlugData) {
      return userContext
    }

    const orgBySlug = orgBySlugData as OrganizationMemoryRow
    const { data: membershipBySlugData, error: membershipBySlugError } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", orgBySlug.id)
      .eq("user_id", userId)
      .single()

    if (membershipBySlugError || !membershipBySlugData) {
      return userContext
    }

    // Auto mode should never strand requests on an org without Turso credentials.
    if (!orgBySlug.turso_db_url || !orgBySlug.turso_db_token) {
      return userContext
    }

    const membership = membershipBySlugData as OrgMembershipRow
    return {
      ownerType: "organization",
      userId,
      orgId: orgBySlug.id,
      orgRole: membership.role,
      plan: resolveOrganizationPlan(orgBySlug, user.plan),
      turso_db_url: orgBySlug.turso_db_url,
      turso_db_token: orgBySlug.turso_db_token,
      turso_db_name: orgBySlug.turso_db_name,
    }
  }

  if (!user.current_org_id) {
    return userContext
  }

  const { data: membershipData, error: membershipError } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", user.current_org_id)
    .eq("user_id", userId)
    .single()

  if (membershipError || !membershipData) {
    return userContext
  }

  const { data: orgData, error: orgError } = await supabase
    .from("organizations")
    .select(
      "id, slug, plan, subscription_status, stripe_subscription_id, turso_db_url, turso_db_token, turso_db_name"
    )
    .eq("id", user.current_org_id)
    .single()

  if (orgError || !orgData) {
    return userContext
  }

  const org = orgData as OrganizationMemoryRow
  const membership = membershipData as OrgMembershipRow
  const hasOrgCredentials = Boolean(org.turso_db_url && org.turso_db_token)

  if (!hasOrgCredentials && fallbackToUserWithoutOrgCredentials) {
    return userContext
  }

  return {
    ownerType: "organization",
    userId,
    orgId: org.id,
    orgRole: membership.role,
    plan: resolveOrganizationPlan(org, user.plan),
    turso_db_url: org.turso_db_url,
    turso_db_token: org.turso_db_token,
    turso_db_name: org.turso_db_name,
  }
}
