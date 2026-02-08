import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  // Get API key from Authorization header
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 })
  }

  const apiKey = authHeader.slice(7)
  if (!apiKey.startsWith("mcp_")) {
    return NextResponse.json({ error: "Invalid API key format" }, { status: 401 })
  }

  const rateLimited = await checkRateLimit(apiRateLimit, apiKey)
  if (rateLimited) return rateLimited

  // Look up user by API key
  const admin = createAdminClient()
  const { data: user, error } = await admin
    .from("users")
    .select("turso_db_url, turso_db_token")
    .eq("mcp_api_key", apiKey)
    .single()

  if (error || !user) {
    console.error("Credentials lookup error:", error)
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
  }

  if (!user.turso_db_url || !user.turso_db_token) {
    return NextResponse.json({ error: "Database not provisioned" }, { status: 400 })
  }

  return NextResponse.json({
    turso_db_url: user.turso_db_url,
    turso_db_token: user.turso_db_token,
  })
}
