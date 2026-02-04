import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"

// GET - Get current API key (masked)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: userData } = await admin
    .from("users")
    .select("mcp_api_key")
    .eq("id", user.id)
    .single()

  if (!userData?.mcp_api_key) {
    return NextResponse.json({ hasKey: false })
  }

  // Return masked key (show first 8 and last 4 chars)
  const key = userData.mcp_api_key
  const masked = `${key.slice(0, 12)}...${key.slice(-4)}`

  return NextResponse.json({ 
    hasKey: true, 
    maskedKey: masked,
  })
}

// POST - Generate new API key
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Generate a new API key
  const apiKey = `mcp_${randomBytes(32).toString("hex")}`

  const admin = createAdminClient()
  const { error } = await admin
    .from("users")
    .update({ mcp_api_key: apiKey })
    .eq("id", user.id)

  if (error) {
    return NextResponse.json({ error: "Failed to generate key" }, { status: 500 })
  }

  // Return the full key (only time it's shown)
  return NextResponse.json({ 
    apiKey,
    message: "Save this key - it won't be shown again",
  })
}

// DELETE - Revoke API key
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("users")
    .update({ mcp_api_key: null })
    .eq("id", user.id)

  if (error) {
    return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
