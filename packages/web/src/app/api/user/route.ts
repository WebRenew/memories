import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))

  const updates: Record<string, string> = {}

  if (typeof body.name === "string" && body.name.length <= 200) {
    updates.name = body.name
  }

  if (typeof body.turso_db_url === "string" && body.turso_db_url.length <= 500) {
    if (body.turso_db_url === "" || body.turso_db_url.startsWith("libsql://") || body.turso_db_url.startsWith("https://")) {
      updates.turso_db_url = body.turso_db_url
    }
  }

  if (typeof body.turso_db_token === "string" && body.turso_db_token.length <= 2000) {
    updates.turso_db_token = body.turso_db_token
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
