import { authenticateRequest } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient as createTurso } from "@libsql/client"
import { NextResponse } from "next/server"
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit"
import { resolveActiveMemoryContext } from "@/lib/active-memory-context"

const FREE_LIMIT = 5000

export async function GET(request: Request) {
  const auth = await authenticateRequest(request)

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimited = await checkRateLimit(apiRateLimit, auth.userId)
  if (rateLimited) return rateLimited

  const admin = createAdminClient()
  const context = await resolveActiveMemoryContext(admin, auth.userId)
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!context.turso_db_url || !context.turso_db_token) {
    return NextResponse.json({
      plan: context.plan ?? "free",
      memoryLimit: FREE_LIMIT,
      memoryCount: 0,
    })
  }

  const plan = context.plan ?? "free"
  const isPro = plan === "pro"

  let memoryCount = 0
  try {
    const turso = createTurso({
      url: context.turso_db_url,
      authToken: context.turso_db_token,
    })
    const result = await turso.execute(
      "SELECT COUNT(*) as count FROM memories WHERE deleted_at IS NULL"
    )
    memoryCount = Number(result.rows[0]?.count ?? 0)
  } catch {
    // If we can't connect, return 0
  }

  return NextResponse.json({
    plan,
    memoryLimit: isPro ? null : FREE_LIMIT,
    memoryCount,
  })
}
