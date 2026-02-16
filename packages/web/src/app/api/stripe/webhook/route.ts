import { getStripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import type Stripe from "stripe"
import {
  getStripeGrowthPriceIds,
  getStripeIndividualPriceIds,
  getStripeManagedPriceIds,
  getStripeTeamSeatPriceIds,
  getStripeWebhookSecret,
} from "@/lib/env"

type StripeBillingPlan = "individual" | "team" | "growth"

const MANAGED_PRICE_IDS = getStripeManagedPriceIds()
const INDIVIDUAL_PRICE_IDS = getStripeIndividualPriceIds()
const TEAM_PRICE_IDS = getStripeTeamSeatPriceIds()
const GROWTH_PRICE_IDS = getStripeGrowthPriceIds()

function hasManagedPrice(items: { price?: { id: string } | null }[]): boolean {
  return items.some((item) => item.price?.id && MANAGED_PRICE_IDS.has(item.price.id))
}

function detectBillingPlanFromItems(items: { price?: { id: string } | null }[]): StripeBillingPlan | null {
  const priceIds = new Set(items.map((item) => item.price?.id).filter((id): id is string => Boolean(id)))
  if ([...priceIds].some((id) => GROWTH_PRICE_IDS.has(id))) return "growth"
  if ([...priceIds].some((id) => TEAM_PRICE_IDS.has(id))) return "team"
  if ([...priceIds].some((id) => INDIVIDUAL_PRICE_IDS.has(id))) return "individual"
  return null
}

function isTeamSubscription(metadata: Stripe.Metadata | null | undefined): boolean {
  return metadata?.type === "team_seats"
}

function parseMetadataBillingPlan(metadata: Stripe.Metadata | null | undefined): StripeBillingPlan | null {
  const billingPlan = metadata?.billing_plan
  if (billingPlan === "individual" || billingPlan === "team" || billingPlan === "growth") {
    return billingPlan
  }

  const type = metadata?.type
  if (type === "team_seats") return "team"
  if (type === "growth_base") return "growth"
  if (type === "individual") return "individual"
  return null
}

function planForActiveUserSubscription(plan: StripeBillingPlan | null): "individual" | "growth" {
  return plan === "growth" ? "growth" : "individual"
}

function planForActiveOrgSubscription(plan: StripeBillingPlan | null): "team" | "growth" {
  return plan === "growth" ? "growth" : "team"
}

async function updateUserPlan(
  supabase: ReturnType<typeof createAdminClient>,
  filter: { id?: string; stripe_customer_id?: string },
  updates: Record<string, string>
) {
  let query = supabase.from("users").update(updates)
  if (filter.id) query = query.eq("id", filter.id)
  if (filter.stripe_customer_id) query = query.eq("stripe_customer_id", filter.stripe_customer_id)

  const { error } = await query
  if (error) {
    console.error("Webhook user update failed:", error)
    return false
  }
  return true
}

async function updateOrgSubscriptionStatus(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  status: "active" | "past_due" | "cancelled",
  options: {
    stripeCustomerId?: string
    stripeSubscriptionId?: string | null
    activePlan?: "team" | "growth"
  } = {}
) {
  const updates: Record<string, string | null> = {
    subscription_status: status,
    plan:
      status === "active"
        ? (options.activePlan ?? "team")
        : status === "past_due"
          ? "past_due"
          : "free",
  }

  if (options.stripeCustomerId) {
    updates.stripe_customer_id = options.stripeCustomerId
  }

  if (status === "cancelled") {
    updates.stripe_subscription_id = null
  } else if (options.stripeSubscriptionId) {
    updates.stripe_subscription_id = options.stripeSubscriptionId
  }
  
  const { error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", orgId)

  if (error) {
    console.error("Webhook org update failed:", error)
    return false
  }
  return true
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      getStripeWebhookSecret()
    )
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = createAdminClient()
  let ok = true

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object

      // Verify the checkout contains one of our managed subscription price IDs.
      const lineItems = await getStripe().checkout.sessions.listLineItems(session.id, { limit: 5 })
      if (!hasManagedPrice(lineItems.data)) break
      const planFromItems = detectBillingPlanFromItems(lineItems.data)
      const planFromMetadata = parseMetadataBillingPlan(session.metadata)
      const plan = planFromMetadata ?? planFromItems

      const ownerType = session.metadata?.workspace_owner_type
      const orgId = session.metadata?.workspace_org_id
      const sessionSubscription = session.subscription
      const subscriptionId =
        typeof sessionSubscription === "string"
          ? sessionSubscription
          : sessionSubscription && typeof sessionSubscription === "object"
            ? sessionSubscription.id
            : null
      const customerId = typeof session.customer === "string" ? session.customer : null

      if (ownerType === "organization" && orgId) {
        ok = await updateOrgSubscriptionStatus(supabase, orgId, "active", {
          stripeCustomerId: customerId ?? undefined,
          stripeSubscriptionId: subscriptionId,
          activePlan: planForActiveOrgSubscription(plan),
        })
        break
      }

      const userId = session.metadata?.supabase_user_id
      if (!userId) break

      const userUpdates: Record<string, string> = { plan: planForActiveUserSubscription(plan) }
      if (customerId) {
        userUpdates.stripe_customer_id = customerId
      }
      ok = await updateUserPlan(supabase, { id: userId }, userUpdates)
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object
      const customerId = subscription.customer as string

      // Only act on subscriptions for our managed prices.
      if (!hasManagedPrice(subscription.items.data)) break
      const planFromItems = detectBillingPlanFromItems(subscription.items.data)
      const planFromMetadata = parseMetadataBillingPlan(subscription.metadata)
      const subscriptionPlan = planFromMetadata ?? planFromItems

      const orgId = subscription.metadata.org_id
      if (orgId && typeof orgId === "string") {
        const statusMap: Record<string, "active" | "past_due" | "cancelled"> = {
          active: "active",
          trialing: "active",
          past_due: "past_due",
          unpaid: "cancelled",
          canceled: "cancelled",
          incomplete: "cancelled",
          incomplete_expired: "cancelled",
          paused: "cancelled",
        }
        const status = statusMap[subscription.status] ?? "cancelled"
        ok = await updateOrgSubscriptionStatus(supabase, orgId, status, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          activePlan: planForActiveOrgSubscription(subscriptionPlan),
        })
        break
      }

      // Individual subscription
      const planMap: Record<string, string> = {
        active: planForActiveUserSubscription(subscriptionPlan),
        trialing: planForActiveUserSubscription(subscriptionPlan),
        past_due: "past_due",
        unpaid: "free",
        canceled: "free",
        incomplete: "free",
        incomplete_expired: "free",
        paused: "free",
      }
      const resolvedPlan = planMap[subscription.status] ?? "free"

      ok = await updateUserPlan(supabase, { stripe_customer_id: customerId }, { plan: resolvedPlan })
      break
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object
      const customerId = subscription.customer as string

      // Only act on subscriptions for our managed prices.
      if (!hasManagedPrice(subscription.items.data)) break
      const planFromItems = detectBillingPlanFromItems(subscription.items.data)
      const planFromMetadata = parseMetadataBillingPlan(subscription.metadata)
      const plan = planFromMetadata ?? planFromItems

      // Handle organization subscriptions.
      if (subscription.metadata.org_id) {
        const orgId = subscription.metadata.org_id
        if (!orgId || typeof orgId !== "string") {
          console.error("Organization subscription missing org_id metadata:", subscription.id)
          break
        }
        ok = await updateOrgSubscriptionStatus(supabase, orgId, "cancelled", {
          stripeCustomerId: customerId,
          activePlan: planForActiveOrgSubscription(plan),
        })
        break
      }

      // Individual subscription
      ok = await updateUserPlan(supabase, { stripe_customer_id: customerId }, { plan: "free" })
      break
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string
      const subscriptionId = (invoice as { subscription?: string | null }).subscription

      // Only act on invoices for our managed prices.
      if (!invoice.lines?.data || !hasManagedPrice(invoice.lines.data as { price?: { id: string } | null }[])) break

      let handled = false

      // Check if this is for an organization subscription.
      if (subscriptionId && typeof subscriptionId === "string") {
        try {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
          const orgId = subscription.metadata.org_id
          if (orgId && typeof orgId === "string") {
            const subscriptionPlan = parseMetadataBillingPlan(subscription.metadata) ??
              detectBillingPlanFromItems(subscription.items.data)
            ok = await updateOrgSubscriptionStatus(supabase, orgId, "past_due", {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              activePlan: planForActiveOrgSubscription(subscriptionPlan),
            })
            handled = true
          } else if (isTeamSubscription(subscription.metadata)) {
            console.error("Team subscription missing org_id for invoice:", subscriptionId)
          }
        } catch (e) {
          console.error("Failed to retrieve subscription for invoice:", e)
        }
      }

      // Individual subscription (only if not handled as team)
      if (!handled) {
        ok = await updateUserPlan(supabase, { stripe_customer_id: customerId }, { plan: "past_due" })
      }
      break
    }

    case "invoice.marked_uncollectible": {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string
      const subscriptionId = (invoice as { subscription?: string | null }).subscription

      // Only act on invoices for our managed prices.
      if (!invoice.lines?.data || !hasManagedPrice(invoice.lines.data as { price?: { id: string } | null }[])) break

      let handled = false

      // Check if this is for an organization subscription.
      if (subscriptionId && typeof subscriptionId === "string") {
        try {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
          const orgId = subscription.metadata.org_id
          if (orgId && typeof orgId === "string") {
            const subscriptionPlan = parseMetadataBillingPlan(subscription.metadata) ??
              detectBillingPlanFromItems(subscription.items.data)
            ok = await updateOrgSubscriptionStatus(supabase, orgId, "cancelled", {
              stripeCustomerId: customerId,
              activePlan: planForActiveOrgSubscription(subscriptionPlan),
            })
            handled = true
          } else if (isTeamSubscription(subscription.metadata)) {
            console.error("Team subscription missing org_id for invoice:", subscriptionId)
          }
        } catch (e) {
          console.error("Failed to retrieve subscription for invoice:", e)
        }
      }

      // Individual subscription (only if not handled as team)
      if (!handled) {
        ok = await updateUserPlan(supabase, { stripe_customer_id: customerId }, { plan: "free" })
      }
      break
    }
  }

  if (!ok) {
    return NextResponse.json({ error: "DB update failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
