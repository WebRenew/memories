import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit"
import { parseBody, updateUserSchema } from "@/lib/validations"

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimited = await checkRateLimit(apiRateLimit, user.id)
  if (rateLimited) return rateLimited

  const parsed = parseBody(updateUserSchema, await request.json().catch(() => ({})))
  if (!parsed.success) return parsed.response

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
      const { data: membership } = await supabase
        .from("org_members")
        .select("id")
        .eq("org_id", parsed.data.current_org_id)
        .eq("user_id", user.id)
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

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", user.id)

  if (error) {
    console.error("User update error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
