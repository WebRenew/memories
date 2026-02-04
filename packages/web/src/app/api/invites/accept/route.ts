import { createClient } from "@/lib/supabase/server"
import { addTeamSeat } from "@/lib/stripe/teams"
import { NextResponse } from "next/server"

// POST /api/invites/accept - Accept an invite
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { token, billing = "monthly" } = body

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 })
  }

  // Find invite with org details
  const { data: invite, error: inviteError } = await supabase
    .from("org_invites")
    .select("*, organization:organizations(id, name, slug, owner_id, stripe_subscription_id)")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single()

  if (inviteError || !invite) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 })
  }

  // Get user's email
  const { data: profile } = await supabase
    .from("users")
    .select("email")
    .eq("id", user.id)
    .single()

  // Verify email matches (case insensitive)
  if (profile?.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json({ 
      error: `This invite was sent to ${invite.email}. Please sign in with that email address.` 
    }, { status: 403 })
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", invite.org_id)
    .eq("user_id", user.id)
    .single()

  if (existingMember) {
    return NextResponse.json({ error: "You are already a member of this organization" }, { status: 400 })
  }

  const org = invite.organization as {
    id: string
    name: string
    slug: string
    owner_id: string
    stripe_subscription_id: string | null
  }

  // Get org owner's Stripe customer ID
  const { data: owner } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", org.owner_id)
    .single()

  // Add seat to org's subscription (or create one)
  let subscriptionId = org.stripe_subscription_id
  try {
    const result = await addTeamSeat({
      orgId: org.id,
      stripeCustomerId: owner?.stripe_customer_id || null,
      stripeSubscriptionId: subscriptionId,
      billing: billing as "monthly" | "annual",
    })

    // If new subscription created, save it to org
    if (result.action === "created") {
      await supabase
        .from("organizations")
        .update({ stripe_subscription_id: result.subscriptionId })
        .eq("id", org.id)
    }
  } catch (e) {
    console.error("Failed to add team seat:", e)
    // Don't block invite acceptance if billing fails - can reconcile later
    // In production you might want to handle this differently
  }

  // Add as member
  const { error: memberError } = await supabase
    .from("org_members")
    .insert({
      org_id: invite.org_id,
      user_id: user.id,
      role: invite.role,
      invited_by: invite.invited_by,
    })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  // Mark invite as accepted
  await supabase
    .from("org_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id)

  // Set as user's current org if they don't have one
  await supabase
    .from("users")
    .update({ current_org_id: invite.org_id })
    .eq("id", user.id)
    .is("current_org_id", null)

  return NextResponse.json({ 
    success: true,
    organization: { id: org.id, name: org.name, slug: org.slug }
  })
}
