import { authenticateRequest } from "@/lib/auth"
import { strictRateLimit, checkRateLimit } from "@/lib/rate-limit"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient as createTurso } from "@libsql/client"
import { initSchema } from "@/lib/turso"
import { NextResponse } from "next/server"
import { z } from "zod"
import { parseBody } from "@/lib/validations"

const migrateSchema = z.object({
  direction: z.enum(["personal_to_org", "org_to_personal"]),
  orgId: z.string().min(1, "Organization ID is required"),
})

/**
 * Copy memories between a user's personal Turso database and an organization's
 * Turso database. This is a non-destructive copy — source records are never deleted.
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimited = await checkRateLimit(strictRateLimit, auth.userId)
  if (rateLimited) return rateLimited

  const parsed = parseBody(migrateSchema, await request.json().catch(() => ({})))
  if (!parsed.success) return parsed.response

  const { direction, orgId } = parsed.data
  const admin = createAdminClient()

  // Verify org membership with owner or admin role
  const { data: membership, error: membershipError } = await admin
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", auth.userId)
    .single()

  if (membershipError || !membership) {
    return NextResponse.json(
      { error: "You are not a member of this organization" },
      { status: 403 }
    )
  }

  if (membership.role !== "owner" && membership.role !== "admin") {
    return NextResponse.json(
      { error: "Only owners and admins can migrate memories" },
      { status: 403 }
    )
  }

  // Fetch user Turso credentials
  const { data: userData, error: userError } = await admin
    .from("users")
    .select("turso_db_url, turso_db_token")
    .eq("id", auth.userId)
    .single()

  if (userError || !userData?.turso_db_url || !userData?.turso_db_token) {
    return NextResponse.json(
      { error: "Your personal database is not provisioned" },
      { status: 400 }
    )
  }

  // Fetch org Turso credentials
  const { data: orgData, error: orgError } = await admin
    .from("organizations")
    .select("turso_db_url, turso_db_token")
    .eq("id", orgId)
    .single()

  if (orgError || !orgData?.turso_db_url || !orgData?.turso_db_token) {
    return NextResponse.json(
      { error: "Organization database is not provisioned" },
      { status: 400 }
    )
  }

  const sourceUrl = direction === "personal_to_org" ? userData.turso_db_url : orgData.turso_db_url
  const sourceToken = direction === "personal_to_org" ? userData.turso_db_token : orgData.turso_db_token
  const destUrl = direction === "personal_to_org" ? orgData.turso_db_url : userData.turso_db_url
  const destToken = direction === "personal_to_org" ? orgData.turso_db_token : userData.turso_db_token

  try {
    const sourceDb = createTurso({ url: sourceUrl, authToken: sourceToken })
    const destDb = createTurso({ url: destUrl, authToken: destToken })

    // Ensure destination schema is ready
    await initSchema(destUrl, destToken)

    // Read all non-deleted memories from source
    const sourceResult = await sourceDb.execute(
      "SELECT id, content, tags, type, scope, project_id, paths, category, metadata, created_at, updated_at FROM memories WHERE deleted_at IS NULL"
    )

    if (sourceResult.rows.length === 0) {
      return NextResponse.json({ migrated: 0, skipped: 0, total: 0 })
    }

    // Get existing IDs in destination to skip duplicates
    const destResult = await destDb.execute(
      "SELECT id FROM memories WHERE deleted_at IS NULL"
    )
    const existingIds = new Set(destResult.rows.map((r) => r.id as string))

    let migrated = 0
    let skipped = 0

    for (const row of sourceResult.rows) {
      if (existingIds.has(row.id as string)) {
        skipped++
        continue
      }

      try {
        await destDb.execute({
          sql: `INSERT INTO memories (id, content, tags, type, scope, project_id, paths, category, metadata, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            row.id as string,
            row.content as string,
            (row.tags as string | null) ?? null,
            (row.type as string) ?? "note",
            (row.scope as string) ?? "global",
            (row.project_id as string | null) ?? null,
            (row.paths as string | null) ?? null,
            (row.category as string | null) ?? null,
            (row.metadata as string | null) ?? null,
            row.created_at as string,
            (row.updated_at as string) ?? (row.created_at as string),
          ],
        })
        migrated++
      } catch (insertError) {
        // Skip individual insert failures (e.g. constraint violations)
        console.error(`Failed to migrate memory ${row.id}:`, insertError)
        skipped++
      }
    }

    return NextResponse.json({
      migrated,
      skipped,
      total: sourceResult.rows.length,
    })
  } catch (err) {
    console.error("Memory migration error:", err)
    return NextResponse.json(
      { error: "Migration failed — could not connect to one or both databases" },
      { status: 500 }
    )
  }
}
