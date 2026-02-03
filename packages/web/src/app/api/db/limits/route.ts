import { authenticateRequest } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient as createTurso } from "@libsql/client"
import { NextResponse } from "next/server"

const FREE_LIMIT = 5000

export async function GET(request: Request) {
  const auth = await authenticateRequest(request)

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("users")
    .select("turso_db_url, turso_db_token, plan")
    .eq("id", auth.userId)
    .single()

  if (!profile?.turso_db_url || !profile?.turso_db_token) {
    return NextResponse.json({
      plan: profile?.plan ?? "free",
      memoryLimit: FREE_LIMIT,
      memoryCount: 0,
    })
  }

  const plan = profile.plan ?? "free"
  const isPro = plan === "pro"

  let memoryCount = 0
  try {
    const turso = createTurso({
      url: profile.turso_db_url,
      authToken: profile.turso_db_token,
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
