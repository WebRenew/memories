import { NextResponse } from "next/server"

export const LEGACY_MCP_TENANTS_ENDPOINT = "/api/mcp/tenants"
export const LEGACY_MANAGEMENT_TENANTS_ENDPOINT = "/api/sdk/v1/management/tenants"
export const LEGACY_TENANT_SUCCESSOR_ENDPOINT = "/api/sdk/v1/management/tenant-overrides"
export const LEGACY_TENANT_SUNSET = "Tue, 30 Jun 2026 00:00:00 GMT"
export const LEGACY_TENANT_WARNING =
  `299 - "Deprecated API: migrate to ${LEGACY_TENANT_SUCCESSOR_ENDPOINT} before ${LEGACY_TENANT_SUNSET}"`

export const LEGACY_TENANT_MILESTONES = [
  {
    phase: "announce",
    date: "2026-02-16",
    detail: "Deprecation announced in docs and release notes. Compatibility wrappers enabled.",
  },
  {
    phase: "warn",
    date: "2026-04-01",
    detail: "Warning header and telemetry alerts enforced for all legacy tenant route calls.",
  },
  {
    phase: "enforce",
    date: "2026-06-01",
    detail: "New integrations are blocked from onboarding to legacy tenant routes.",
  },
  {
    phase: "sunset",
    date: "2026-06-30",
    detail: "Legacy tenant routes reach announced sunset timestamp.",
  },
  {
    phase: "remove",
    date: "2026-07-15",
    detail: "Legacy route handlers are removed after usage remains zero for 14 days.",
  },
] as const

export const LEGACY_TENANT_PASSTHROUGH_HEADERS = [
  "Retry-After",
  "X-RateLimit-Limit",
  "X-RateLimit-Remaining",
  "X-RateLimit-Reset",
] as const

export function applyLegacyTenantHeaders(response: NextResponse): NextResponse {
  response.headers.set("Deprecation", "true")
  response.headers.set("Sunset", LEGACY_TENANT_SUNSET)
  response.headers.set("Link", `<${LEGACY_TENANT_SUCCESSOR_ENDPOINT}>; rel="successor-version"`)
  response.headers.set("Warning", LEGACY_TENANT_WARNING)
  return response
}

export function copySelectedHeaders(
  source: Headers,
  target: Headers,
  headerNames: readonly string[]
): void {
  for (const headerName of headerNames) {
    const value = source.get(headerName)
    if (value) {
      target.set(headerName, value)
    }
  }
}
