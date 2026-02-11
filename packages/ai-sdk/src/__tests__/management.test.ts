import { describe, expect, it, vi } from "vitest"
import { memoriesManagement } from "../management"

function createMockClient() {
  return {
    management: {
      keys: {
        get: vi.fn().mockResolvedValue({ hasKey: true, keyPreview: "mcp_abcd****1234" }),
        create: vi.fn().mockResolvedValue({ apiKey: "mcp_new_key" }),
        revoke: vi.fn().mockResolvedValue({ ok: true }),
      },
      tenants: {
        list: vi.fn().mockResolvedValue({ tenantDatabases: [], count: 0 }),
        upsert: vi.fn().mockResolvedValue({
          tenantDatabase: { tenantId: "tenant-a", tursoDbUrl: "libsql://tenant-a.turso.io", status: "ready" },
          provisioned: true,
          mode: "provision",
        }),
        disable: vi.fn().mockResolvedValue({ ok: true, tenantId: "tenant-a", status: "disabled", updatedAt: "now" }),
      },
    },
  }
}

describe("memoriesManagement", () => {
  it("does not require tenantId when a client instance is provided", async () => {
    const client = createMockClient()
    const management = memoriesManagement({ client: client as unknown as any })

    const keyStatus = await management.keys.get()
    const created = await management.keys.create({ expiresAt: "2026-12-31T00:00:00.000Z" })
    const revoked = await management.keys.revoke()
    const listed = await management.tenants.list()
    const upserted = await management.tenants.upsert({ tenantId: "tenant-a", mode: "provision" })
    const disabled = await management.tenants.disable("tenant-a")

    expect(keyStatus.hasKey).toBe(true)
    expect(created.apiKey).toBe("mcp_new_key")
    expect(revoked.ok).toBe(true)
    expect(listed.count).toBe(0)
    expect(upserted.tenantDatabase.tenantId).toBe("tenant-a")
    expect(disabled.status).toBe("disabled")

    expect(client.management.keys.get).toHaveBeenCalledOnce()
    expect(client.management.keys.create).toHaveBeenCalledWith({ expiresAt: "2026-12-31T00:00:00.000Z" })
    expect(client.management.keys.revoke).toHaveBeenCalledOnce()
    expect(client.management.tenants.list).toHaveBeenCalledOnce()
    expect(client.management.tenants.upsert).toHaveBeenCalledWith({ tenantId: "tenant-a", mode: "provision" })
    expect(client.management.tenants.disable).toHaveBeenCalledWith("tenant-a")
  })

  it("allows construction without tenantId for management-only usage", () => {
    const management = memoriesManagement({ apiKey: "mcp_test", fetch: vi.fn() as unknown as typeof fetch })

    expect(typeof management.keys.get).toBe("function")
    expect(typeof management.tenants.list).toBe("function")
  })
})
