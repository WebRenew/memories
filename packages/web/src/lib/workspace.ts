import {
  resolveActiveMemoryContext,
  type ActiveMemoryContext,
  type ResolveActiveMemoryContextOptions,
} from "@/lib/active-memory-context"

export type WorkspacePlan = "free" | "individual" | "team" | "growth" | "past_due"

export const GROWTH_INCLUDED_PROJECTS_PER_MONTH = 500
export const GROWTH_OVERAGE_USD_PER_PROJECT = 0.05

export interface WorkspaceContext extends Omit<ActiveMemoryContext, "plan"> {
  plan: WorkspacePlan
  hasDatabase: boolean
  canProvision: boolean
  canManageBilling: boolean
}

export function normalizeWorkspacePlan(plan: string | null | undefined): WorkspacePlan {
  if (plan === "past_due") {
    return "past_due"
  }

  if (plan === "growth" || plan === "enterprise") {
    return "growth"
  }

  if (plan === "team") {
    return "team"
  }

  if (plan === "individual" || plan === "pro") {
    return "individual"
  }

  return "free"
}

export function normalizeActiveOrganizationPlan(plan: string | null | undefined): WorkspacePlan {
  if (plan === "past_due") {
    return "past_due"
  }

  if (plan === "growth" || plan === "enterprise") {
    return "growth"
  }

  // Legacy org plans ("pro") map to the current team seat plan.
  if (plan === "team" || plan === "pro" || plan === "individual") {
    return "team"
  }

  // An active org subscription without explicit tier metadata is treated as team.
  return "team"
}

export function isPaidWorkspacePlan(plan: WorkspacePlan): boolean {
  return plan === "individual" || plan === "team" || plan === "growth"
}

export function isGrowthWorkspacePlan(plan: WorkspacePlan): boolean {
  return plan === "growth"
}

export function getWorkspacePlanLabel(plan: WorkspacePlan): string {
  if (plan === "individual") return "Individual"
  if (plan === "team") return "Team"
  if (plan === "growth") return "Growth"
  if (plan === "past_due") return "Past due"
  return "Free"
}

export function includedSdkProjectsForPlan(plan: WorkspacePlan): number {
  return plan === "growth" ? GROWTH_INCLUDED_PROJECTS_PER_MONTH : 0
}

export function canProvisionWorkspace(
  ownerType: ActiveMemoryContext["ownerType"],
  orgRole: ActiveMemoryContext["orgRole"]
): boolean {
  if (ownerType === "user") {
    return true
  }
  return orgRole === "owner" || orgRole === "admin"
}

export function canManageWorkspaceBilling(
  ownerType: ActiveMemoryContext["ownerType"],
  orgRole: ActiveMemoryContext["orgRole"]
): boolean {
  if (ownerType === "user") {
    return true
  }
  return orgRole === "owner"
}

export async function resolveWorkspaceContext(
  client: unknown,
  userId: string,
  options: ResolveActiveMemoryContextOptions = {}
): Promise<WorkspaceContext | null> {
  const context = await resolveActiveMemoryContext(client, userId, options)
  if (!context) {
    return null
  }

  return {
    ...context,
    plan: normalizeWorkspacePlan(context.plan),
    hasDatabase: Boolean(context.turso_db_url && context.turso_db_token),
    canProvision: canProvisionWorkspace(context.ownerType, context.orgRole),
    canManageBilling: canManageWorkspaceBilling(context.ownerType, context.orgRole),
  }
}
