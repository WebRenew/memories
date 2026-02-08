import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe"
import { NextResponse } from "next/server"
import { checkRateLimit, strictRateLimit } from "@/lib/rate-limit"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimited = await checkRateLimit(strictRateLimit, user.id)
  if (rateLimited) return rateLimited

  const { data: profile } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account found" }, { status: 400 })
  }

  const { origin } = new URL(request.url)

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${origin}/app/settings`,
  })

  return NextResponse.json({ url: session.url })
}
