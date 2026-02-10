import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockGetUser, mockFrom, mockCheckRateLimit } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockCheckRateLimit: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

vi.mock("@/lib/rate-limit", () => ({
  apiRateLimit: { limit: vi.fn() },
  checkRateLimit: mockCheckRateLimit,
}))

import { PATCH } from "../route"

function makeRequest(body: unknown) {
  return new Request("https://example.com/api/user", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

describe("/api/user PATCH", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue(null)
  })

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const response = await PATCH(makeRequest({ name: "New Name" }))
    expect(response.status).toBe(401)
  })

  it("returns 403 when switching to an org the user is not a member of", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })

    mockFrom.mockImplementation((table: string) => {
      if (table === "org_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
              }),
            }),
          }),
        }
      }

      if (table === "users") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }

      return {}
    })

    const response = await PATCH(makeRequest({ current_org_id: "org-1" }))
    expect(response.status).toBe(403)
  })

  it("updates current_org_id when membership is valid", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === "org_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: "membership-1" }, error: null }),
              }),
            }),
          }),
        }
      }

      if (table === "users") {
        return {
          update: mockUpdate,
        }
      }

      return {}
    })

    const response = await PATCH(makeRequest({ current_org_id: "org-1" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({ current_org_id: "org-1" })
  })

  it("allows clearing current_org_id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return { update: mockUpdate }
      }
      return {}
    })

    const response = await PATCH(makeRequest({ current_org_id: null }))
    expect(response.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ current_org_id: null })
  })
})
