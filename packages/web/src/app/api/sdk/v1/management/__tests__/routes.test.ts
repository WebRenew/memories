import { describe, expect, it, vi } from "vitest"

const { mockKeyGet, mockKeyPost, mockKeyDelete, mockTenantsGet, mockTenantsPost, mockTenantsDelete } = vi.hoisted(() => ({
  mockKeyGet: vi.fn(),
  mockKeyPost: vi.fn(),
  mockKeyDelete: vi.fn(),
  mockTenantsGet: vi.fn(),
  mockTenantsPost: vi.fn(),
  mockTenantsDelete: vi.fn(),
}))

vi.mock("@/app/api/mcp/key/route", () => ({
  GET: mockKeyGet,
  POST: mockKeyPost,
  DELETE: mockKeyDelete,
}))

vi.mock("@/app/api/mcp/tenants/route", () => ({
  GET: mockTenantsGet,
  POST: mockTenantsPost,
  DELETE: mockTenantsDelete,
}))

import { DELETE as keysDelete, GET as keysGet, POST as keysPost } from "../keys/route"
import {
  DELETE as tenantsDelete,
  GET as tenantsGet,
  POST as tenantsPost,
} from "../tenants/route"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

describe("/api/sdk/v1/management/keys", () => {
  it("wraps successful key GET response in sdk envelope", async () => {
    mockKeyGet.mockResolvedValue(
      jsonResponse({
        hasKey: true,
        keyPreview: "mcp_abcd****1234",
      })
    )

    const response = await keysGet()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.data.hasKey).toBe(true)
    expect(body.meta.endpoint).toBe("/api/sdk/v1/management/keys")
  })

  it("wraps failed key POST response in typed sdk error envelope", async () => {
    mockKeyPost.mockResolvedValue(jsonResponse({ error: "expiresAt is required" }, 400))

    const response = await keysPost(new Request("https://example.com", { method: "POST", body: "{}" }))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.ok).toBe(false)
    expect(body.error.type).toBe("validation_error")
    expect(body.error.code).toBe("LEGACY_MCP_KEY_ERROR")
  })

  it("forwards delete status", async () => {
    mockKeyDelete.mockResolvedValue(jsonResponse({ ok: true }, 200))

    const response = await keysDelete()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
  })
})

describe("/api/sdk/v1/management/tenants", () => {
  it("wraps successful tenants GET response in sdk envelope", async () => {
    mockTenantsGet.mockResolvedValue(
      jsonResponse({
        tenantDatabases: [{ tenantId: "tenant-a", status: "ready" }],
        count: 1,
      })
    )

    const response = await tenantsGet(new Request("https://example.com", { method: "GET" }))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.data.count).toBe(1)
    expect(body.meta.endpoint).toBe("/api/sdk/v1/management/tenants")
  })

  it("wraps failed tenant POST response in typed sdk error envelope", async () => {
    mockTenantsPost.mockResolvedValue(jsonResponse({ error: "tenantId is required" }, 400))

    const response = await tenantsPost(new Request("https://example.com", { method: "POST", body: "{}" }))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.ok).toBe(false)
    expect(body.error.type).toBe("validation_error")
    expect(body.error.code).toBe("LEGACY_MCP_TENANTS_ERROR")
  })

  it("forwards delete response", async () => {
    mockTenantsDelete.mockResolvedValue(jsonResponse({ ok: true }, 200))

    const response = await tenantsDelete(new Request("https://example.com?tenantId=t1", { method: "DELETE" }))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
  })
})
