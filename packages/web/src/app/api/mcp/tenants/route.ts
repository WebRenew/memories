import { DELETE as overridesDelete, GET as overridesGet, POST as overridesPost } from "@/app/api/sdk/v1/management/tenant-overrides/route"
import { type LegacyRouteAuthMode, recordLegacyRouteUsageEvent } from "@/lib/legacy-route-telemetry"
import {
  applyLegacyTenantHeaders,
  copySelectedHeaders,
  LEGACY_MCP_TENANTS_ENDPOINT,
  LEGACY_TENANT_PASSTHROUGH_HEADERS,
  LEGACY_TENANT_SUCCESSOR_ENDPOINT,
} from "@/lib/sdk-api/legacy-tenant-route-policy"
import { NextRequest, NextResponse } from "next/server"

type LegacyMethod = "GET" | "POST" | "DELETE"

type SdkEnvelopeLike = {
  ok?: boolean
  data?: unknown
  error?: {
    message?: string
    code?: string
    details?: Record<string, unknown>
  } | null
}

function resolveAuthMode(request: Request): LegacyRouteAuthMode {
  const authorization = request.headers.get("authorization")
  if (authorization?.startsWith("Bearer ")) {
    return "api_key"
  }
  return "session"
}

function mapSdkEnvelopeToLegacyBody(payload: unknown, status: number): Record<string, unknown> {
  if (payload && typeof payload === "object") {
    const envelope = payload as SdkEnvelopeLike
    if (envelope.ok === true) {
      const data = envelope.data
      if (data && typeof data === "object") {
        return data as Record<string, unknown>
      }
      return {}
    }

    if (envelope.ok === false) {
      const message =
        envelope.error?.message ??
        (status >= 500
          ? "Legacy tenant endpoint failed due to an internal error"
          : "Legacy tenant endpoint request failed")

      const errorBody: Record<string, unknown> = { error: message }
      if (envelope.error?.code) {
        errorBody.code = envelope.error.code
      }
      if (envelope.error?.details) {
        errorBody.details = envelope.error.details
      }
      return errorBody
    }

    return payload as Record<string, unknown>
  }

  return {
    error:
      status >= 500
        ? "Legacy tenant endpoint failed due to an internal error"
        : "Legacy tenant endpoint request failed",
  }
}

function logDeprecatedAccess(endpoint: string, method: LegacyMethod, status: number, authMode: LegacyRouteAuthMode): void {
  console.warn(
    `[DEPRECATED_ENDPOINT] ${endpoint} ${method} status=${status} authMode=${authMode} -> use ${LEGACY_TENANT_SUCCESSOR_ENDPOINT}`
  )
}

async function wrapLegacyResponse(
  requestId: string,
  method: LegacyMethod,
  request: Request,
  response: Response
): Promise<NextResponse> {
  const payload = await response.json().catch(() => null)
  const body = mapSdkEnvelopeToLegacyBody(payload, response.status)
  const authMode = resolveAuthMode(request)

  const legacyResponse = NextResponse.json(body, { status: response.status })
  copySelectedHeaders(response.headers, legacyResponse.headers, LEGACY_TENANT_PASSTHROUGH_HEADERS)
  applyLegacyTenantHeaders(legacyResponse)

  await recordLegacyRouteUsageEvent({
    route: LEGACY_MCP_TENANTS_ENDPOINT,
    successorRoute: LEGACY_TENANT_SUCCESSOR_ENDPOINT,
    method,
    status: legacyResponse.status,
    requestId,
    authMode,
    metadata: {
      wrappedEndpoint: LEGACY_TENANT_SUCCESSOR_ENDPOINT,
    },
  })
  logDeprecatedAccess(LEGACY_MCP_TENANTS_ENDPOINT, method, legacyResponse.status, authMode)

  return legacyResponse
}

export async function GET(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID()
  const response = await overridesGet(request as NextRequest)
  return wrapLegacyResponse(requestId, "GET", request, response)
}

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID()
  const response = await overridesPost(request as NextRequest)
  return wrapLegacyResponse(requestId, "POST", request, response)
}

export async function DELETE(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID()
  const response = await overridesDelete(request as NextRequest)
  return wrapLegacyResponse(requestId, "DELETE", request, response)
}
