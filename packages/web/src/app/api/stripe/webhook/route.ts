import { getStripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

async function updatePlan(
  supabase: ReturnType<typeof createAdminClient>,
  filter: { id?: string; stripe_customer_id?: string },
  updates: Record<string, string>
) {
  let query = supabase.from("users").update(updates)
  if (filter.id) query = query.eq("id", filter.id)
  if (filter.stripe_customer_id) query = query.eq("stripe_customer_id", filter.stripe_customer_id)

  const { error } = await query
  if (error) {
    console.error("Webhook DB update failed:", error)
    return false
  }
  return true
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")!

  let event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = createAdminClient()
  let ok = true

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object
      const userId = session.metadata?.supabase_user_id
      if (userId) {
        ok = await updatePlan(supabase, { id: userId }, {
          plan: "pro",
          stripe_customer_id: session.customer as string,
        })
      }
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object
      const customerId = subscription.customer as string

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

      ok = await updatePlan(supabase, { stripe_customer_id: customerId }, { plan })
      break
    }

    case "customer.subscription.deleted": {
      const customerId = event.data.object.customer as string
      ok = await updatePlan(supabase, { stripe_customer_id: customerId }, { plan: "free" })
      break
    }

    case "invoice.payment_failed": {
      const customerId = event.data.object.customer as string
      ok = await updatePlan(supabase, { stripe_customer_id: customerId }, { plan: "past_due" })
      break
    }

    case "invoice.marked_uncollectible": {
      const customerId = event.data.object.customer as string
      ok = await updatePlan(supabase, { stripe_customer_id: customerId }, { plan: "free" })
      break
    }
  }

  if (!ok) {
    return NextResponse.json({ error: "DB update failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
