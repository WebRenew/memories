import { authenticateRequest } from "@/lib/auth"
import { getStripe } from "@/lib/stripe"
import { NextResponse } from "next/server"
import { checkRateLimit, strictRateLimit } from "@/lib/rate-limit"
import { parseBody, checkoutSchema } from "@/lib/validations"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveWorkspaceContext } from "@/lib/workspace"

async function getOrCreateUserCustomerId(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string
): Promise<string | null> {
  const { data: profile } = await admin
    .from("users")
    .select("stripe_customer_id, email")
    .eq("id", userId)
    .single()

  let customerId = profile?.stripe_customer_id
  if (customerId) return customerId

  try {
    const customerEmail = profile?.email || email || undefined
    const customer = await getStripe().customers.create(
      {
        email: customerEmail,
        metadata: { supabase_user_id: userId },
      },
      {
        idempotencyKey: `customer_create_${userId}`,
      }
    )
    customerId = customer.id

    await admin
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId)
  } catch {
    const { data: refreshed } = await admin
      .from("users")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single()

    customerId = refreshed?.stripe_customer_id
  }

  return customerId ?? null
}

async function getOrCreateOrganizationCustomerId(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string
): Promise<string | null> {
  const { data: org } = await admin
    .from("organizations")
    .select("stripe_customer_id, name")
    .eq("id", orgId)
    .single()

  let customerId = org?.stripe_customer_id
  if (customerId) return customerId

  try {
    const customer = await getStripe().customers.create(
      {
        name: org?.name ?? undefined,
        metadata: {
          workspace_owner_type: "organization",
          workspace_org_id: orgId,
        },
      },
      {
        idempotencyKey: `org_customer_create_${orgId}`,
      }
    )
    customerId = customer.id

    await admin
      .from("organizations")
      .update({ stripe_customer_id: customerId })
      .eq("id", orgId)
  } catch {
    const { data: refreshed } = await admin
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", orgId)
      .single()

    customerId = refreshed?.stripe_customer_id
  }

  return customerId ?? null
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request)

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimited = await checkRateLimit(strictRateLimit, auth.userId)
  if (rateLimited) return rateLimited

  const admin = createAdminClient()
  const workspace = await resolveWorkspaceContext(admin, auth.userId)
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!workspace.canManageBilling) {
    return NextResponse.json(
      { error: "Only organization owners can manage billing" },
      { status: 403 }
    )
  }

  if (workspace.plan === "pro") {
    return NextResponse.json({ error: "Workspace is already on Pro" }, { status: 400 })
  }

  const parsed = parseBody(checkoutSchema, await request.json().catch(() => ({})))
  if (!parsed.success) return parsed.response
  const { billing } = parsed.data

  const priceId =
    billing === "annual"
      ? process.env.STRIPE_PRO_PRICE_ID_ANNUAL!
      : process.env.STRIPE_PRO_PRICE_ID!

  let customerId: string | null = null
  if (workspace.ownerType === "organization") {
    if (!workspace.orgId) {
      return NextResponse.json({ error: "Failed to resolve organization workspace" }, { status: 500 })
    }
    customerId = await getOrCreateOrganizationCustomerId(admin, workspace.orgId)
  } else {
    customerId = await getOrCreateUserCustomerId(admin, auth.userId, auth.email)
  }

  if (!customerId) {
    return NextResponse.json({ error: "Failed to create billing account" }, { status: 500 })
  }

  try {
    const { origin } = new URL(request.url)
    const metadata: Record<string, string> = {
      supabase_user_id: auth.userId,
      workspace_owner_type: workspace.ownerType,
    }
    if (workspace.orgId) {
      metadata.workspace_org_id = workspace.orgId
    }

    const sessionPayload: {
      customer: string
      line_items: { price: string; quantity: number }[]
      mode: "subscription"
      success_url: string
      cancel_url: string
      metadata: Record<string, string>
      subscription_data?: { metadata: Record<string, string> }
    } = {
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/app?upgraded=true`,
      cancel_url: `${origin}/app/upgrade`,
      metadata,
    }

    if (workspace.ownerType === "organization" && workspace.orgId) {
      sessionPayload.subscription_data = {
        metadata: {
          type: "team_seats",
          org_id: workspace.orgId,
          created_by_user_id: auth.userId,
        },
      }
    }

    const session = await getStripe().checkout.sessions.create(sessionPayload)

    return NextResponse.json({ url: session.url })
  } catch {
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
