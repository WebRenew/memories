import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit"
import { authenticateRequest } from "@/lib/auth"
import { resolveActiveMemoryContext } from "@/lib/active-memory-context"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 })
  }

  const bearer = authHeader.slice(7)
  const rateLimited = await checkRateLimit(apiRateLimit, bearer)
  if (rateLimited) return rateLimited

  const admin = createAdminClient()
  let userId: string | null = null

  // Bearer mcp_* is used by hosted MCP and --api-key flows.
  if (bearer.startsWith("mcp_")) {
    const res = await admin
      .from("users")
      .select("id")
      .eq("mcp_api_key", bearer)
      .single()
    if (res.error || !res.data?.id) {
      console.error("Credentials lookup error:", res.error)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }
    userId = res.data.id as string
  } else {
    // Bearer cli_* (or session cookies) is used by CLI login/sync flows.
    const auth = await authenticateRequest(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    userId = auth.userId
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const context = await resolveActiveMemoryContext(admin, userId)
  if (!context) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }

  if (!context.turso_db_url || !context.turso_db_token) {
    return NextResponse.json({ error: "Database not provisioned" }, { status: 400 })
  }

  // Return both canonical and legacy keys for compatibility with existing clients.
  return NextResponse.json({
    url: context.turso_db_url,
    token: context.turso_db_token,
    dbName: context.turso_db_name,
    turso_db_url: context.turso_db_url,
    turso_db_token: context.turso_db_token,
    turso_db_name: context.turso_db_name,
    ownerType: context.ownerType,
    orgId: context.orgId,
  })
}
