import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Look up user by CLI token
  const admin = createAdminClient()
  const { data: user, error } = await admin
    .from("users")
    .select("turso_db_url, turso_db_token, turso_db_name")
    .eq("cli_token", token)
    .single()

  if (error || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  if (!user.turso_db_url || !user.turso_db_token) {
    return NextResponse.json(
      { error: "No database provisioned" },
      { status: 404 }
    )
  }

  return NextResponse.json({
    url: user.turso_db_url,
    token: user.turso_db_token,
    dbName: user.turso_db_name ?? "",
  })
}
