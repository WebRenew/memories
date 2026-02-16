import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit"
import {
  formatMcpApiKeyPreview,
  generateMcpApiKey,
  getMcpApiKeyLast4,
  getMcpApiKeyPrefix,
  hashMcpApiKey,
} from "@/lib/mcp-api-key"

const MAX_KEY_TTL_DAYS = 365
const MAX_KEY_TTL_MS = MAX_KEY_TTL_DAYS * 24 * 60 * 60 * 1000
const MIN_KEY_TTL_MS = 60 * 1000
const LEGACY_ENDPOINT = "/api/mcp/key"
const SUCCESSOR_ENDPOINT = "/api/sdk/v1/management/keys"
const LEGACY_SUNSET = "Tue, 30 Jun 2026 00:00:00 GMT"

function applyLegacyHeaders(response: NextResponse): NextResponse {
  response.headers.set("Deprecation", "true")
  response.headers.set("Sunset", LEGACY_SUNSET)
  response.headers.set("Link", `<${SUCCESSOR_ENDPOINT}>; rel="successor-version"`)
  return response
}

function legacyJson(body: unknown, init?: { status?: number }): NextResponse {
  return applyLegacyHeaders(NextResponse.json(body, init))
}

function logDeprecatedAccess(method: "GET" | "POST" | "DELETE", userId?: string): void {
  const userSegment = userId ? ` (user:${userId})` : ""
  console.warn(`[DEPRECATED_ENDPOINT] ${LEGACY_ENDPOINT} ${method}${userSegment} -> use ${SUCCESSOR_ENDPOINT}`)
}

function parseRequestedExpiry(rawExpiry: unknown): { expiresAt: string } | { error: string } {
  if (typeof rawExpiry !== "string" || rawExpiry.trim().length === 0) {
    return { error: "expiresAt is required" }
  }

  const parsed = new Date(rawExpiry)
  if (Number.isNaN(parsed.getTime())) {
    return { error: "expiresAt must be a valid ISO datetime" }
  }

  const now = Date.now()
  if (parsed.getTime() <= now + MIN_KEY_TTL_MS) {
    return { error: "expiresAt must be at least 1 minute in the future" }
  }

  if (parsed.getTime() > now + MAX_KEY_TTL_MS) {
    return { error: `expiresAt cannot be more than ${MAX_KEY_TTL_DAYS} days in the future` }
  }

  return { expiresAt: parsed.toISOString() }
}

// GET - Get current API key
export async function GET(): Promise<Response> {
  logDeprecatedAccess("GET")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return legacyJson({ error: "Unauthorized" }, { status: 401 })
  }
  logDeprecatedAccess("GET", user.id)

  const rateLimited = await checkRateLimit(apiRateLimit, user.id)
  if (rateLimited) return applyLegacyHeaders(rateLimited)

  const admin = createAdminClient()
  const { data: userData, error: userDataError } = await admin
    .from("users")
    .select("mcp_api_key_hash, mcp_api_key_prefix, mcp_api_key_last4, mcp_api_key_created_at, mcp_api_key_expires_at")
    .eq("id", user.id)
    .single()

  if (userDataError) {
    console.error("Failed to load API key status metadata:", userDataError)
    return legacyJson({ error: "Failed to load API key status metadata" }, { status: 500 })
  }

  if (!userData?.mcp_api_key_hash) {
    return legacyJson({ hasKey: false })
  }

  const keyPreview = formatMcpApiKeyPreview(userData.mcp_api_key_prefix, userData.mcp_api_key_last4)
  const expiresAt = userData.mcp_api_key_expires_at as string | null
  const isExpired = !expiresAt || new Date(expiresAt).getTime() <= Date.now()

  return legacyJson({ 
    hasKey: true, 
    keyPreview,
    createdAt: userData.mcp_api_key_created_at,
    expiresAt,
    isExpired,
  })
}

// POST - Generate new API key
export async function POST(request: Request): Promise<Response> {
  logDeprecatedAccess("POST")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return legacyJson({ error: "Unauthorized" }, { status: 401 })
  }
  logDeprecatedAccess("POST", user.id)

  const rateLimited = await checkRateLimit(apiRateLimit, user.id)
  if (rateLimited) return applyLegacyHeaders(rateLimited)

  let body: { expiresAt?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    // Body is validated below.
  }

  const expiry = parseRequestedExpiry(body.expiresAt)
  if ("error" in expiry) {
    return legacyJson({ error: expiry.error }, { status: 400 })
  }

  const apiKey = generateMcpApiKey()
  const apiKeyHash = hashMcpApiKey(apiKey)
  const apiKeyPrefix = getMcpApiKeyPrefix(apiKey)
  const apiKeyLast4 = getMcpApiKeyLast4(apiKey)
  const createdAt = new Date().toISOString()

  const admin = createAdminClient()
  const { error } = await admin
    .from("users")
    .update({
      mcp_api_key: null,
      mcp_api_key_hash: apiKeyHash,
      mcp_api_key_prefix: apiKeyPrefix,
      mcp_api_key_last4: apiKeyLast4,
      mcp_api_key_created_at: createdAt,
      mcp_api_key_expires_at: expiry.expiresAt,
    })
    .eq("id", user.id)

  if (error) {
    return legacyJson({ error: "Failed to generate key" }, { status: 500 })
  }

  // Return the full key (only time it's shown)
  return legacyJson({ 
    apiKey,
    keyPreview: formatMcpApiKeyPreview(apiKeyPrefix, apiKeyLast4),
    createdAt,
    expiresAt: expiry.expiresAt,
    message: "Save this key - it won't be shown again",
  })
}

// DELETE - Revoke API key
export async function DELETE(): Promise<Response> {
  logDeprecatedAccess("DELETE")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return legacyJson({ error: "Unauthorized" }, { status: 401 })
  }
  logDeprecatedAccess("DELETE", user.id)

  const rateLimited = await checkRateLimit(apiRateLimit, user.id)
  if (rateLimited) return applyLegacyHeaders(rateLimited)

  const admin = createAdminClient()

  const { error } = await admin
    .from("users")
    .update({
      mcp_api_key: null,
      mcp_api_key_hash: null,
      mcp_api_key_prefix: null,
      mcp_api_key_last4: null,
      mcp_api_key_created_at: null,
      mcp_api_key_expires_at: null,
    })
    .eq("id", user.id)

  if (error) {
    return legacyJson({ error: "Failed to revoke key" }, { status: 500 })
  }

  return legacyJson({ ok: true })
}
