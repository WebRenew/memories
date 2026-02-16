import { authenticateRequest } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createDatabase, createDatabaseToken, initSchema } from "@/lib/turso"
import { applyTursoDomainAlias, buildLibsqlUrlFromHostname } from "@/lib/turso-domain"
import { NextResponse } from "next/server"
import { setTimeout as delay } from "node:timers/promises"
import { checkPreAuthApiRateLimit, checkRateLimit, strictRateLimit } from "@/lib/rate-limit"
import { resolveWorkspaceContext } from "@/lib/workspace"
import { getTursoOrgSlug } from "@/lib/env"

export async function POST(request: Request): Promise<Response> {
  const preAuthRateLimited = await checkPreAuthApiRateLimit(request)
  if (preAuthRateLimited) return preAuthRateLimited

  const auth = await authenticateRequest(request)

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimited = await checkRateLimit(strictRateLimit, auth.userId)
  if (rateLimited) return rateLimited

  const admin = createAdminClient()
  let context = await resolveWorkspaceContext(admin, auth.userId, {
    fallbackToUserWithoutOrgCredentials: false,
  })

  // Ensure user row exists (trigger may not have fired yet).
  if (!context) {
    const { error: insertError } = await admin
      .from("users")
      .upsert({ id: auth.userId, email: auth.email }, { onConflict: "id" })

    if (insertError) {
      console.error("Failed to create user row:", insertError)
      return NextResponse.json(
        { error: "Failed to initialize user" },
        { status: 500 }
      )
    }

    context = await resolveWorkspaceContext(admin, auth.userId, {
      fallbackToUserWithoutOrgCredentials: false,
    })
  }

  if (!context) {
    return NextResponse.json(
      { error: "Failed to resolve active memory target" },
      { status: 500 }
    )
  }

  if (context.hasDatabase && context.turso_db_url && context.turso_db_token) {
    const url = applyTursoDomainAlias(context.turso_db_url)
    return NextResponse.json({
      url,
      provisioned: false,
    })
  }

  if (!context.canProvision) {
    return NextResponse.json(
      { error: "Only owners or admins can provision organization memory" },
      { status: 403 }
    )
  }

  if (context.ownerType === "organization" && !context.orgId) {
    return NextResponse.json(
      { error: "Failed to resolve organization context" },
      { status: 500 }
    )
  }

  try {
    const tursoOrg = getTursoOrgSlug()
    // Create a new Turso database
    const db = await createDatabase(tursoOrg)
    const token = await createDatabaseToken(tursoOrg, db.name)
    const canonicalUrl = `libsql://${db.hostname}`
    const url = buildLibsqlUrlFromHostname(db.hostname)

    // Wait for Turso to finish provisioning
    await delay(3000)

    // Initialize the schema
    await initSchema(canonicalUrl, token)

    let error: { message?: string } | null = null
    if (context.ownerType === "organization" && context.orgId) {
      const res = await admin
        .from("organizations")
        .update({ turso_db_url: url, turso_db_token: token, turso_db_name: db.name })
        .eq("id", context.orgId)
      error = res.error
    } else {
      const res = await admin
        .from("users")
        .update({ turso_db_url: url, turso_db_token: token, turso_db_name: db.name })
        .eq("id", auth.userId)
      error = res.error
    }

    if (error) {
      return NextResponse.json(
        { error: "Failed to save database credentials" },
        { status: 500 }
      )
    }

    return NextResponse.json({ url, provisioned: true })
  } catch (err) {
    console.error("Provisioning error:", err)
    return NextResponse.json(
      { error: "Failed to provision database" },
      { status: 500 }
    )
  }
}
