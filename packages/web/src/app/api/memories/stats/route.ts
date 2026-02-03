import { createClient } from "@/lib/supabase/server"
import { createClient as createTurso } from "@libsql/client"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("users")
    .select("turso_db_url, turso_db_token")
    .eq("id", user.id)
    .single()

  if (!profile?.turso_db_url || !profile?.turso_db_token) {
    return NextResponse.json({ error: "Turso not configured" }, { status: 400 })
  }

  try {
    const turso = createTurso({
      url: profile.turso_db_url,
      authToken: profile.turso_db_token,
    })

    const [totalResult, agentResult, dailyResult] = await Promise.all([
      turso.execute("SELECT COUNT(*) as count FROM memories"),
      turso.execute("SELECT agent, COUNT(*) as count FROM memories GROUP BY agent ORDER BY count DESC"),
      turso.execute(
        "SELECT DATE(created_at) as date, COUNT(*) as count FROM memories GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30"
      ),
    ])

    return NextResponse.json({
      total: Number(totalResult.rows[0]?.count ?? 0),
      byAgent: agentResult.rows.map((r) => ({
        agent: String(r.agent ?? "unknown"),
        count: Number(r.count),
      })),
      byDay: dailyResult.rows.map((r) => ({
        date: String(r.date),
        count: Number(r.count),
      })),
    })
  } catch {
    return NextResponse.json({ error: "Failed to connect to Turso" }, { status: 500 })
  }
}
