import { getStripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import type Stripe from "stripe"

const PRO_PRICE_IDS = new Set(
  [process.env.STRIPE_PRO_PRICE_ID, process.env.STRIPE_PRO_PRICE_ID_ANNUAL].filter(Boolean)
)

function hasProPrice(items: { price?: { id: string } | null }[]): boolean {
  return items.some((item) => item.price?.id && PRO_PRICE_IDS.has(item.price.id))
}

function isTeamSubscription(metadata: Stripe.Metadata | null | undefined): boolean {
  return metadata?.type === "team_seats"
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
  status: "active" | "past_due" | "cancelled"
) {
  const updates: Record<string, string | null> = { subscription_status: status }
  
  // If cancelled, clear the subscription ID
  if (status === "cancelled") {
    updates.stripe_subscription_id = null
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

export async function POST(request: Request) {
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
      process.env.STRIPE_WEBHOOK_SECRET!
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
      const userId = session.metadata?.supabase_user_id
      if (!userId) break

      // Verify the checkout contains one of our Pro price IDs
      const lineItems = await getStripe().checkout.sessions.listLineItems(session.id, { limit: 5 })
      if (!hasProPrice(lineItems.data)) break

      ok = await updateUserPlan(supabase, { id: userId }, {
        plan: "pro",
        stripe_customer_id: session.customer as string,
      })
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object
      const customerId = subscription.customer as string

      // Only act on subscriptions for our Pro prices
      if (!hasProPrice(subscription.items.data)) break

      // Handle team subscriptions separately
      if (isTeamSubscription(subscription.metadata)) {
        const orgId = subscription.metadata.org_id
        if (!orgId || typeof orgId !== "string") {
          console.error("Team subscription missing org_id metadata:", subscription.id)
          break
        }

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
        ok = await updateOrgSubscriptionStatus(supabase, orgId, status)
        break
      }

      // Individual subscription
      const planMap: Record<string, string> = {
        active: "pro",
        trialing: "pro",
        past_due: "past_due",
        unpaid: "free",
        canceled: "free",
        incomplete: "free",
        incomplete_expired: "free",
        paused: "free",
      }
      const plan = planMap[subscription.status] ?? "free"

      ok = await updateUserPlan(supabase, { stripe_customer_id: customerId }, { plan })
      break
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object
      const customerId = subscription.customer as string

      // Only act on subscriptions for our Pro prices
      if (!hasProPrice(subscription.items.data)) break

      // Handle team subscriptions
      if (isTeamSubscription(subscription.metadata)) {
        const orgId = subscription.metadata.org_id
        if (!orgId || typeof orgId !== "string") {
          console.error("Team subscription missing org_id metadata:", subscription.id)
          break
        }
        ok = await updateOrgSubscriptionStatus(supabase, orgId, "cancelled")
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

      // Only act on invoices for our Pro prices
      if (!invoice.lines?.data || !hasProPrice(invoice.lines.data as { price?: { id: string } | null }[])) break

      let handled = false

      // Check if this is for a team subscription
      if (subscriptionId && typeof subscriptionId === "string") {
        try {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
          if (isTeamSubscription(subscription.metadata)) {
            const orgId = subscription.metadata.org_id
            if (orgId && typeof orgId === "string") {
              ok = await updateOrgSubscriptionStatus(supabase, orgId, "past_due")
              handled = true
            } else {
              console.error("Team subscription missing org_id for invoice:", subscriptionId)
            }
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

      // Only act on invoices for our Pro prices
      if (!invoice.lines?.data || !hasProPrice(invoice.lines.data as { price?: { id: string } | null }[])) break

      let handled = false

      // Check if this is for a team subscription
      if (subscriptionId && typeof subscriptionId === "string") {
        try {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
          if (isTeamSubscription(subscription.metadata)) {
            const orgId = subscription.metadata.org_id
            if (orgId && typeof orgId === "string") {
              ok = await updateOrgSubscriptionStatus(supabase, orgId, "cancelled")
              handled = true
            } else {
              console.error("Team subscription missing org_id for invoice:", subscriptionId)
            }
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
