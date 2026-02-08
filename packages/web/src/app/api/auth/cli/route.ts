import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { checkRateLimit, getClientIp, publicRateLimit } from "@/lib/rate-limit"

export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(publicRateLimit, getClientIp(request))
  if (rateLimited) return rateLimited

  const body = await request.json().catch(() => ({}))

  // Validate code format on both actions
  if (body.action === "poll" || body.action === "approve") {
    const code = body.code as string
    if (!code || typeof code !== "string" || !/^[a-f0-9]{32}$/.test(code)) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 })
    }
  }

  if (body.action === "poll") {
    // CLI is polling for its token — look up by cli_auth_code in the database
    const admin = createAdminClient()
    const { data: user } = await admin
      .from("users")
      .select("cli_token, email")
      .eq("cli_auth_code", body.code)
      .single()

    if (!user || !user.cli_token) {
      // Still waiting or code not found
      return NextResponse.json({ status: "pending" }, { status: 202 })
    }

    // Clear the auth code so it can't be reused
    await admin
      .from("users")
      .update({ cli_auth_code: null })
      .eq("cli_auth_code", body.code)

    return NextResponse.json({
      token: user.cli_token,
      email: user.email,
    })
  }

  if (body.action === "approve") {
    // Browser is approving the CLI auth
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Generate a CLI token
    const cliToken = `cli_${randomBytes(32).toString("hex")}`

    // Save token and auth code to user's row
    const admin = createAdminClient()
    const { error } = await admin
      .from("users")
      .update({ cli_token: cliToken, cli_auth_code: body.code })
      .eq("id", user.id)

    if (error) {
      return NextResponse.json(
        { error: "Failed to create token" },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
