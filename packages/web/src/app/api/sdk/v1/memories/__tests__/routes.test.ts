import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const {
  mockUserSelect,
  mockTenantSelect,
  mockResolveActiveMemoryContext,
  mockAddMemoryPayload,
  mockSearchMemoriesPayload,
  mockListMemoriesPayload,
  mockEditMemoryPayload,
  mockForgetMemoryPayload,
  mockExecute,
} = vi.hoisted(() => ({
  mockUserSelect: vi.fn(),
  mockTenantSelect: vi.fn(),
  mockResolveActiveMemoryContext: vi.fn(),
  mockAddMemoryPayload: vi.fn(),
  mockSearchMemoriesPayload: vi.fn(),
  mockListMemoriesPayload: vi.fn(),
  mockEditMemoryPayload: vi.fn(),
  mockForgetMemoryPayload: vi.fn(),
  mockExecute: vi.fn(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => {
        const filters: Record<string, unknown> = {}
        const query = {
          eq: vi.fn((column: string, value: unknown) => {
            filters[column] = value
            return query
          }),
          single: vi.fn(() => {
            if (table === "users") {
              return mockUserSelect({ table, filters })
            }
            if (table === "sdk_tenant_databases") {
              return mockTenantSelect({ table, filters })
            }
            return { data: null, error: { message: `Unexpected table: ${table}` } }
          }),
        }
        return query
      }),
    })),
  })),
}))

vi.mock("@/lib/active-memory-context", () => ({
  resolveActiveMemoryContext: mockResolveActiveMemoryContext,
}))

vi.mock("@/lib/rate-limit", () => ({
  mcpRateLimit: { limit: vi.fn().mockResolvedValue({ success: true }) },
  checkRateLimit: vi.fn().mockResolvedValue(null),
}))

vi.mock("@/lib/memory-service/mutations", () => ({
  addMemoryPayload: mockAddMemoryPayload,
  editMemoryPayload: mockEditMemoryPayload,
  forgetMemoryPayload: mockForgetMemoryPayload,
}))

vi.mock("@/lib/memory-service/queries", () => ({
  searchMemoriesPayload: mockSearchMemoriesPayload,
  listMemoriesPayload: mockListMemoriesPayload,
}))

vi.mock("@libsql/client", () => ({
  createClient: vi.fn(() => ({
    execute: mockExecute,
  })),
}))

import { POST as addPOST } from "../add/route"
import { POST as searchPOST } from "../search/route"
import { POST as listPOST } from "../list/route"
import { POST as editPOST } from "../edit/route"
import { POST as forgetPOST } from "../forget/route"
import { GET as healthGET } from "../../health/route"

const VALID_API_KEY = `mcp_${"a".repeat(64)}`

function normalizeEnvelope(body: Record<string, unknown>) {
  return {
    ...body,
    meta: {
      ...(typeof body.meta === "object" && body.meta ? body.meta : {}),
      requestId: "<request-id>",
      timestamp: "<timestamp>",
    },
  }
}

function makePost(path: string, body: unknown, apiKey?: string): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  }

  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`
  }

  return new NextRequest(`https://example.com${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
}

describe("/api/sdk/v1/memories/*", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUserSelect.mockReturnValue({
      data: {
        id: "user-1",
        mcp_api_key_expires_at: "2099-01-01T00:00:00.000Z",
      },
      error: null,
    })

    mockTenantSelect.mockReturnValue({ data: null, error: { message: "not found" } })

    mockResolveActiveMemoryContext.mockResolvedValue({
      ownerType: "user",
      orgId: null,
      turso_db_url: "libsql://default-db.turso.io",
      turso_db_token: "default-token",
      turso_db_name: "default-db",
    })

    mockExecute.mockResolvedValue({ rows: [] })

    mockAddMemoryPayload.mockResolvedValue({
      text: "Stored note (global): hello",
      data: {
        id: "mem_1",
        message: "Stored note (global): hello",
        memory: { id: "mem_1", content: "hello", type: "note", layer: "long_term" },
      },
    })

    mockSearchMemoriesPayload.mockResolvedValue({
      text: "Found 1 memories",
      data: {
        memories: [{ id: "mem_1", content: "hello" }],
        count: 1,
      },
    })

    mockListMemoriesPayload.mockResolvedValue({
      text: "1 memories",
      data: {
        memories: [{ id: "mem_1", content: "hello" }],
        count: 1,
      },
    })

    mockEditMemoryPayload.mockResolvedValue({
      text: "Updated memory mem_1",
      data: {
        id: "mem_1",
        updated: true,
        message: "Updated memory mem_1",
      },
    })

    mockForgetMemoryPayload.mockResolvedValue({
      text: "Deleted memory mem_1",
      data: {
        id: "mem_1",
        deleted: true,
        message: "Deleted memory mem_1",
      },
    })
  })

  it("add returns 201 envelope", async () => {
    const response = await addPOST(
      makePost(
        "/api/sdk/v1/memories/add",
        {
          content: "hello",
          type: "note",
          scope: {
            projectId: "github.com/acme/platform",
            userId: "end-user-1",
          },
        },
        VALID_API_KEY
      )
    )

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.data.id).toBe("mem_1")
    expect(mockAddMemoryPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "github.com/acme/platform",
        userId: "end-user-1",
      })
    )
    expect(mockResolveActiveMemoryContext).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      expect.objectContaining({
        projectId: "github.com/acme/platform",
        fallbackToUserWithoutOrgCredentials: true,
      })
    )
  })

  it("search returns results envelope", async () => {
    const response = await searchPOST(
      makePost(
        "/api/sdk/v1/memories/search",
        {
          query: "hello",
          scope: {
            userId: "end-user-1",
          },
        },
        VALID_API_KEY
      )
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.data.count).toBe(1)
  })

  it("list returns results envelope", async () => {
    const response = await listPOST(
      makePost(
        "/api/sdk/v1/memories/list",
        {
          limit: 10,
          scope: {
            userId: "end-user-1",
          },
        },
        VALID_API_KEY
      )
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.data.count).toBe(1)
  })

  it("edit requires at least one update field", async () => {
    const response = await editPOST(
      makePost(
        "/api/sdk/v1/memories/edit",
        {
          id: "mem_1",
        },
        VALID_API_KEY
      )
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe("INVALID_REQUEST")
  })

  it("forget returns deletion envelope", async () => {
    const response = await forgetPOST(
      makePost(
        "/api/sdk/v1/memories/forget",
        {
          id: "mem_1",
          scope: {
            userId: "end-user-1",
          },
        },
        VALID_API_KEY
      )
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.data.deleted).toBe(true)
  })

  it("returns tenant mapping error when tenantId is unknown", async () => {
    const response = await addPOST(
      makePost(
        "/api/sdk/v1/memories/add",
        {
          content: "hello",
          scope: {
            tenantId: "missing-tenant",
          },
        },
        VALID_API_KEY
      )
    )

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe("TENANT_DATABASE_NOT_CONFIGURED")
  })
})

describe("/api/sdk/v1/health", () => {
  it("returns health envelope", async () => {
    const response = await healthGET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.data.status).toBe("ok")
    expect(body.meta.endpoint).toBe("/api/sdk/v1/health")
  })

  it("matches sdk health envelope contract snapshot", async () => {
    const response = await healthGET()
    const body = (await response.json()) as Record<string, unknown>

    expect(normalizeEnvelope(body)).toMatchInlineSnapshot(`
      {
        "data": {
          "schemaVersion": "2026-02-11",
          "service": "memories-sdk",
          "status": "ok",
        },
        "error": null,
        "meta": {
          "endpoint": "/api/sdk/v1/health",
          "requestId": "<request-id>",
          "timestamp": "<timestamp>",
          "version": "2026-02-11",
        },
        "ok": true,
      }
    `)
  })
})

describe("/api/sdk/v1/memories envelope contracts", () => {
  it("matches add success envelope snapshot", async () => {
    const response = await addPOST(
      makePost(
        "/api/sdk/v1/memories/add",
        {
          content: "hello",
          type: "note",
          scope: { userId: "end-user-1" },
        },
        VALID_API_KEY
      )
    )

    const body = (await response.json()) as Record<string, unknown>
    expect(normalizeEnvelope(body)).toMatchInlineSnapshot(`
      {
        "data": {
          "id": "mem_1",
          "memory": {
            "content": "hello",
            "id": "mem_1",
            "layer": "long_term",
            "type": "note",
          },
          "message": "Stored note (global): hello",
        },
        "error": null,
        "meta": {
          "endpoint": "/api/sdk/v1/memories/add",
          "requestId": "<request-id>",
          "timestamp": "<timestamp>",
          "version": "2026-02-11",
        },
        "ok": true,
      }
    `)
  })

  it("matches edit validation error envelope snapshot", async () => {
    const response = await editPOST(
      makePost(
        "/api/sdk/v1/memories/edit",
        {
          id: "mem_1",
        },
        VALID_API_KEY
      )
    )

    const body = (await response.json()) as Record<string, unknown>
    expect(normalizeEnvelope(body)).toMatchInlineSnapshot(`
      {
        "data": null,
        "error": {
          "code": "INVALID_REQUEST",
          "message": "Invalid request payload",
          "retryable": false,
          "status": 400,
          "type": "validation_error",
        },
        "meta": {
          "endpoint": "/api/sdk/v1/memories/edit",
          "requestId": "<request-id>",
          "timestamp": "<timestamp>",
          "version": "2026-02-11",
        },
        "ok": false,
      }
    `)
  })
})
