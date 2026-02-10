import { authenticateRequest } from "@/lib/auth"
import { getStripe } from "@/lib/stripe"
import { NextResponse } from "next/server"
import { checkRateLimit, strictRateLimit } from "@/lib/rate-limit"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveWorkspaceContext } from "@/lib/workspace"

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

  let customerId: string | null = null
  if (workspace.ownerType === "organization") {
    if (!workspace.orgId) {
      return NextResponse.json({ error: "Failed to resolve organization workspace" }, { status: 500 })
    }

    const { data: org } = await admin
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", workspace.orgId)
      .single()
    customerId = org?.stripe_customer_id ?? null
  } else {
    const { data: profile } = await admin
      .from("users")
      .select("stripe_customer_id")
      .eq("id", auth.userId)
      .single()
    customerId = profile?.stripe_customer_id ?? null
  }

  if (!customerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 400 })
  }

  const { origin } = new URL(request.url)

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/app/billing`,
  })

  return NextResponse.json({ url: session.url })
}
