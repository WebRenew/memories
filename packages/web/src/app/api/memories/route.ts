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

    const result = await turso.execute(
      "SELECT id, content, tags, agent, created_at FROM memories ORDER BY created_at DESC LIMIT 100"
    )

    return NextResponse.json({ memories: result.rows })
  } catch {
    return NextResponse.json({ error: "Failed to connect to Turso" }, { status: 500 })
  }
}
