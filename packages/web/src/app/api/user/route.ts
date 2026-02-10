import { authenticateRequest } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit"
import { parseBody, updateUserSchema } from "@/lib/validations"

export async function GET(request: Request) {
  const auth = await authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimited = await checkRateLimit(apiRateLimit, auth.userId)
  if (rateLimited) return rateLimited

  const admin = createAdminClient()
  const { data: profile, error } = await admin
    .from("users")
    .select("id, email, name, plan, embedding_model, current_org_id")
    .eq("id", auth.userId)
    .single()

  if (error || !profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json({ user: profile })
}

export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimited = await checkRateLimit(apiRateLimit, auth.userId)
  if (rateLimited) return rateLimited

  const parsed = parseBody(updateUserSchema, await request.json().catch(() => ({})))
  if (!parsed.success) return parsed.response

  const admin = createAdminClient()
  const updates: Record<string, string | null> = {}

  if (parsed.data.name !== undefined) {
    updates.name = parsed.data.name
  }

  if (parsed.data.embedding_model !== undefined) {
    updates.embedding_model = parsed.data.embedding_model
  }

  if (parsed.data.current_org_id !== undefined) {
    if (parsed.data.current_org_id === null) {
      updates.current_org_id = null
    } else {
      const { data: membership } = await admin
        .from("org_members")
        .select("id")
        .eq("org_id", parsed.data.current_org_id)
        .eq("user_id", auth.userId)
        .single()

      if (!membership) {
        return NextResponse.json(
          { error: "You are not a member of that organization" },
          { status: 403 }
        )
      }

      updates.current_org_id = parsed.data.current_org_id
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const { error } = await admin
    .from("users")
    .update(updates)
    .eq("id", auth.userId)

  if (error) {
    console.error("User update error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
