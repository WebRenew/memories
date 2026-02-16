import { getStripeGrowthMeterEventName, getStripeMeterMaxProjectsPerMonth } from "@/lib/env"
import { getStripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  GROWTH_INCLUDED_PROJECTS_PER_MONTH,
  GROWTH_OVERAGE_USD_PER_PROJECT,
  normalizeActiveOrganizationPlan,
  normalizeWorkspacePlan,
  type WorkspacePlan,
} from "@/lib/workspace"

type AdminClient = ReturnType<typeof createAdminClient>

type OrgSubscriptionStatus = "active" | "past_due" | "cancelled" | null

interface UserBillingRow {
  id: string
  plan: string | null
  current_org_id: string | null
  stripe_customer_id: string | null
}

interface OrgBillingRow {
  id: string
  plan: string | null
  subscription_status: OrgSubscriptionStatus
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
}

export interface SdkProjectBillingContext {
  plan: WorkspacePlan
  ownerType: "user" | "organization"
  ownerUserId: string
  orgId: string | null
  stripeCustomerId: string | null
  includedProjects: number
  overageUsdPerProject: number
  maxProjectsPerMonth: number | null
}

function isDuplicateKeyError(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : ""
  if (code === "23505") return true

  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "").toLowerCase()
      : ""
  return message.includes("duplicate key")
}

function isMissingColumnError(error: unknown, column: string): boolean {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "").toLowerCase()
      : ""

  return (
    message.includes("column") &&
    message.includes(column.toLowerCase()) &&
    message.includes("does not exist")
  )
}

function isMissingRelationError(error: unknown, relation: string): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : ""

  if (code === "42P01") return true

  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "").toLowerCase()
      : ""

  return message.includes(`relation "${relation.toLowerCase()}" does not exist`)
}

function resolveOrganizationBillingPlan(
  org: OrgBillingRow,
  fallbackUserPlan: string | null
): WorkspacePlan {
  if (org.subscription_status === "past_due") return "past_due"
  if (org.subscription_status === "cancelled") return "free"

  if (org.subscription_status === "active") {
    if (org.plan) return normalizeActiveOrganizationPlan(org.plan)
    if (org.stripe_subscription_id) return "team"
  }

  return normalizeWorkspacePlan(org.plan ?? fallbackUserPlan)
}

export async function resolveSdkProjectBillingContext(
  admin: AdminClient,
  userId: string
): Promise<SdkProjectBillingContext | null> {
  const { data: userData, error: userError } = await admin
    .from("users")
    .select("id, plan, current_org_id, stripe_customer_id")
    .eq("id", userId)
    .single()

  if (userError || !userData) {
    console.error("SDK billing context: failed to load user profile", userError)
    return null
  }

  const user = userData as UserBillingRow

  if (user.current_org_id) {
    const { data: membershipData, error: membershipError } = await admin
      .from("org_members")
      .select("role")
      .eq("org_id", user.current_org_id)
      .eq("user_id", userId)
      .single()

    if (!membershipError && membershipData) {
      const { data: orgData, error: orgError } = await admin
        .from("organizations")
        .select("id, plan, subscription_status, stripe_subscription_id, stripe_customer_id")
        .eq("id", user.current_org_id)
        .single()

      if (!orgError && orgData) {
        const org = orgData as OrgBillingRow
        return {
          plan: resolveOrganizationBillingPlan(org, user.plan),
          ownerType: "organization",
          ownerUserId: userId,
          orgId: org.id,
          stripeCustomerId: org.stripe_customer_id ?? user.stripe_customer_id,
          includedProjects: GROWTH_INCLUDED_PROJECTS_PER_MONTH,
          overageUsdPerProject: GROWTH_OVERAGE_USD_PER_PROJECT,
          maxProjectsPerMonth: getStripeMeterMaxProjectsPerMonth(),
        }
      }
    }
  }

  return {
    plan: normalizeWorkspacePlan(user.plan),
    ownerType: "user",
    ownerUserId: userId,
    orgId: null,
    stripeCustomerId: user.stripe_customer_id,
    includedProjects: GROWTH_INCLUDED_PROJECTS_PER_MONTH,
    overageUsdPerProject: GROWTH_OVERAGE_USD_PER_PROJECT,
    maxProjectsPerMonth: getStripeMeterMaxProjectsPerMonth(),
  }
}

async function countActiveProjectsByApiKey(admin: AdminClient, apiKeyHash: string): Promise<number> {
  const { count, error } = await admin
    .from("sdk_tenant_databases")
    .select("*", { count: "exact", head: true })
    .eq("api_key_hash", apiKeyHash)
    .neq("status", "disabled")

  if (error) {
    console.error("SDK billing context: failed to count active projects by API key", error)
    return 0
  }

  return Number(count ?? 0)
}

export async function countActiveProjectsForBillingContext(
  admin: AdminClient,
  apiKeyHash: string,
  stripeCustomerId: string | null
): Promise<number> {
  if (!stripeCustomerId) {
    return countActiveProjectsByApiKey(admin, apiKeyHash)
  }

  const byCustomer = await admin
    .from("sdk_tenant_databases")
    .select("*", { count: "exact", head: true })
    .eq("stripe_customer_id", stripeCustomerId)
    .neq("status", "disabled")

  if (byCustomer.error) {
    if (isMissingColumnError(byCustomer.error, "stripe_customer_id")) {
      return countActiveProjectsByApiKey(admin, apiKeyHash)
    }

    console.error("SDK billing context: failed to count active projects by customer", byCustomer.error)
    return 0
  }

  return Number(byCustomer.count ?? 0)
}

export async function enforceSdkProjectProvisionLimit(input: {
  admin: AdminClient
  userId: string
  apiKeyHash: string
}): Promise<
  | { ok: true; billing: SdkProjectBillingContext; activeProjectCount: number }
  | { ok: false; status: number; code: string; message: string }
> {
  const billing = await resolveSdkProjectBillingContext(input.admin, input.userId)
  if (!billing) {
    return {
      ok: false,
      status: 500,
      code: "SDK_BILLING_CONTEXT_UNAVAILABLE",
      message: "Failed to resolve SDK billing context",
    }
  }

  if (billing.plan === "past_due") {
    return {
      ok: false,
      status: 403,
      code: "BILLING_PAST_DUE",
      message: "Billing is past due. Update payment method before creating new AI SDK projects.",
    }
  }

  if (billing.plan !== "growth") {
    return {
      ok: false,
      status: 403,
      code: "GROWTH_PLAN_REQUIRED",
      message: "AI SDK project routing requires the Growth plan.",
    }
  }

  const activeProjectCount = await countActiveProjectsForBillingContext(
    input.admin,
    input.apiKeyHash,
    billing.stripeCustomerId
  )

  const hardMax = billing.maxProjectsPerMonth
  if (hardMax && activeProjectCount >= hardMax) {
    return {
      ok: false,
      status: 429,
      code: "SDK_PROJECT_LIMIT_REACHED",
      message: `Project limit reached for this billing cycle (${hardMax.toLocaleString()} active projects).`,
    }
  }

  return { ok: true, billing, activeProjectCount }
}

function usageMonthStartIso(now = new Date()): string {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
}

function meterIdentifier(customerId: string, tenantId: string, usageMonth: string): string {
  const safeTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80)
  return `sdk_project_${customerId}_${safeTenant}_${usageMonth}`
}

export async function recordGrowthProjectMeterEvent(input: {
  admin: AdminClient
  billing: SdkProjectBillingContext
  apiKeyHash: string
  tenantId: string
}): Promise<void> {
  const { admin, billing, apiKeyHash, tenantId } = input

  if (billing.plan !== "growth" || !billing.stripeCustomerId) {
    return
  }

  const usageMonth = usageMonthStartIso()
  const eventName = getStripeGrowthMeterEventName()
  const identifier = meterIdentifier(billing.stripeCustomerId, tenantId, usageMonth)

  const { data: inserted, error: insertError } = await admin
    .from("sdk_project_meter_events")
    .insert({
      stripe_customer_id: billing.stripeCustomerId,
      tenant_id: tenantId,
      usage_month: usageMonth,
      owner_user_id: billing.ownerUserId,
      owner_type: billing.ownerType,
      owner_org_id: billing.orgId,
      api_key_hash: apiKeyHash,
      event_name: eventName,
      event_identifier: identifier,
      value: 1,
      metadata: {
        includedProjects: billing.includedProjects,
        overageUsdPerProject: billing.overageUsdPerProject,
      },
    })
    .select("id")
    .single()

  if (insertError) {
    if (isDuplicateKeyError(insertError)) {
      return
    }
    if (isMissingRelationError(insertError, "sdk_project_meter_events")) {
      return
    }
    console.error("SDK metering: failed to persist meter event row", insertError)
    return
  }

  const rowId = inserted?.id as string | undefined
  if (!rowId) return

  try {
    await getStripe().billing.meterEvents.create({
      event_name: eventName,
      identifier,
      payload: {
        stripe_customer_id: billing.stripeCustomerId,
        value: "1",
      },
    })

    await admin
      .from("sdk_project_meter_events")
      .update({ stripe_reported_at: new Date().toISOString(), stripe_last_error: null })
      .eq("id", rowId)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("SDK metering: Stripe meter event failed", message)
    await admin
      .from("sdk_project_meter_events")
      .update({ stripe_last_error: message })
      .eq("id", rowId)
  }
}
