import { createClient } from "@/lib/supabase/server"
import { createClient as createTurso } from "@libsql/client"
import { ProvisioningScreen } from "@/components/dashboard/ProvisioningScreen"
import { MemoriesList } from "@/components/dashboard/MemoriesList"

interface Memory {
  id: string
  content: string
  tags: string | null
  type: string | null
  scope: string | null
  created_at: string
}

export default async function MemoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("users")
    .select("turso_db_url, turso_db_token")
    .eq("id", user.id)
    .single()

  const hasTurso = profile?.turso_db_url && profile?.turso_db_token

  if (!hasTurso) {
    return <ProvisioningScreen />
  }

  let memories: Memory[] = []
  let connectError = false

  try {
    const turso = createTurso({ url: profile.turso_db_url!, authToken: profile.turso_db_token! })
    const result = await turso.execute(
      "SELECT id, content, tags, type, scope, created_at FROM memories WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 50"
    )
    memories = result.rows as Memory[]
  } catch (err) {
    console.error("Turso connection error:", err)
    connectError = true
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Memories</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and search your stored memories
          </p>
        </div>
      </div>

      {connectError ? (
        <div className="border border-border bg-card/20 p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Could not connect to your memory database. Please try again later.
          </p>
        </div>
      ) : (
        <MemoriesList initialMemories={memories} />
      )}
    </div>
  )
}
