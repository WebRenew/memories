import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import {
  LEGACY_MANAGEMENT_TENANTS_ENDPOINT,
  LEGACY_TENANT_SUCCESSOR_ENDPOINT,
  LEGACY_TENANT_SUNSET,
} from "@/lib/sdk-api/legacy-tenant-route-policy"

const {
  mockOverridesGet,
  mockOverridesPost,
  mockOverridesDelete,
  mockRecordLegacyRouteUsageEvent,
} = vi.hoisted(() => ({
  mockOverridesGet: vi.fn(),
  mockOverridesPost: vi.fn(),
  mockOverridesDelete: vi.fn(),
  mockRecordLegacyRouteUsageEvent: vi.fn(),
}))

vi.mock("@/app/api/sdk/v1/management/tenant-overrides/route", () => ({
  GET: mockOverridesGet,
  POST: mockOverridesPost,
  DELETE: mockOverridesDelete,
}))

vi.mock("@/lib/legacy-route-telemetry", () => ({
  recordLegacyRouteUsageEvent: mockRecordLegacyRouteUsageEvent,
}))

import { DELETE, GET, POST } from "../route"

function sdkSuccess(data: unknown, status = 200): NextResponse {
  return NextResponse.json(
    {
      ok: true,
      data,
      error: null,
      meta: {
        endpoint: "/api/sdk/v1/management/tenant-overrides",
        requestId: "req-success",
        timestamp: "2026-02-16T00:00:00.000Z",
        version: "2026-02-11",
      },
    },
    { status }
  )
}

function sdkError(status: number, message: string, code = "TENANT_OVERRIDE_ERROR"): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      data: null,
      error: {
        type: "validation_error",
        code,
        message,
        status,
        retryable: false,
      },
      meta: {
        endpoint: "/api/sdk/v1/management/tenant-overrides",
        requestId: "req-error",
        timestamp: "2026-02-16T00:00:00.000Z",
        version: "2026-02-11",
      },
    },
    { status }
  )
}

describe("/api/sdk/v1/management/tenants legacy compatibility wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRecordLegacyRouteUsageEvent.mockResolvedValue(undefined)
  })

  it("returns SDK success envelope with legacy endpoint metadata and deprecation headers", async () => {
    mockOverridesGet.mockResolvedValue(
      sdkSuccess({
        tenantDatabases: [],
        count: 0,
      })
    )

    const response = await GET(new Request("https://example.com/api/sdk/v1/management/tenants") as never)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data).toEqual({
      tenantDatabases: [],
      count: 0,
    })
    expect(body.meta.endpoint).toBe(LEGACY_MANAGEMENT_TENANTS_ENDPOINT)
    expect(response.headers.get("Deprecation")).toBe("true")
    expect(response.headers.get("Sunset")).toBe(LEGACY_TENANT_SUNSET)
    expect(response.headers.get("Link")).toBe(`<${LEGACY_TENANT_SUCCESSOR_ENDPOINT}>; rel="successor-version"`)
    expect(mockRecordLegacyRouteUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        route: LEGACY_MANAGEMENT_TENANTS_ENDPOINT,
        successorRoute: LEGACY_TENANT_SUCCESSOR_ENDPOINT,
        method: "GET",
        status: 200,
      })
    )
  })

  it("maps canonical errors into SDK error envelopes", async () => {
    mockOverridesPost.mockResolvedValue(sdkError(400, "tenantId is required", "INVALID_REQUEST"))

    const response = await POST(
      new Request("https://example.com/api/sdk/v1/management/tenants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }) as never
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe("INVALID_REQUEST")
    expect(body.error.message).toBe("tenantId is required")
    expect(mockRecordLegacyRouteUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        route: LEGACY_MANAGEMENT_TENANTS_ENDPOINT,
        method: "POST",
        status: 400,
      })
    )
  })

  it("forwards rate limit headers from the canonical endpoint", async () => {
    const limited = sdkError(429, "Too many requests", "RATE_LIMITED")
    limited.headers.set("Retry-After", "42")
    limited.headers.set("X-RateLimit-Remaining", "0")

    mockOverridesDelete.mockResolvedValue(limited)

    const response = await DELETE(
      new Request("https://example.com/api/sdk/v1/management/tenants?tenantId=t1", {
        method: "DELETE",
      }) as never
    )

    expect(response.status).toBe(429)
    expect(response.headers.get("Retry-After")).toBe("42")
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0")
    expect(response.headers.get("Deprecation")).toBe("true")
  })
})
