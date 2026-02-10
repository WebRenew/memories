import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  mockConstructEvent,
  mockListLineItems,
  mockRetrieveSubscription,
  mockUsersUpdate,
  mockUsersEq,
  mockOrganizationsUpdate,
  mockOrganizationsEq,
} = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockListLineItems: vi.fn(),
  mockRetrieveSubscription: vi.fn(),
  mockUsersUpdate: vi.fn(),
  mockUsersEq: vi.fn(),
  mockOrganizationsUpdate: vi.fn(),
  mockOrganizationsEq: vi.fn(),
}))

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    checkout: { sessions: { listLineItems: mockListLineItems } },
    subscriptions: { retrieve: mockRetrieveSubscription },
  })),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "users") {
        return { update: mockUsersUpdate }
      }
      if (table === "organizations") {
        return { update: mockOrganizationsUpdate }
      }
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    }),
  })),
}))

import { POST } from "../route"

function makeWebhookRequest(body: string, signature = "sig_test"): Request {
  return new Request("https://example.com/api/stripe/webhook", {
    method: "POST",
    body,
    headers: {
      "stripe-signature": signature,
      "content-type": "application/json",
    },
  })
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsersEq.mockResolvedValue({ error: null })
    mockOrganizationsEq.mockResolvedValue({ error: null })
    mockUsersUpdate.mockReturnValue({ eq: mockUsersEq })
    mockOrganizationsUpdate.mockReturnValue({ eq: mockOrganizationsEq })
    mockRetrieveSubscription.mockResolvedValue({
      id: "sub_team_123",
      metadata: { type: "team_seats", org_id: "org-1" },
    })
  })

  it("returns 400 when stripe-signature is missing", async () => {
    const request = new Request("https://example.com/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it("returns 400 on invalid signature", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature")
    })

    const response = await POST(makeWebhookRequest("{}"))
    expect(response.status).toBe(400)
  })

  it("updates organization billing on org checkout completion", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_org_123",
          customer: "cus_org_123",
          subscription: "sub_org_123",
          metadata: {
            workspace_owner_type: "organization",
            workspace_org_id: "org-1",
            supabase_user_id: "user-1",
          },
        },
      },
    })
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: "price_pro_monthly" } }],
    })

    const response = await POST(makeWebhookRequest("{}"))
    expect(response.status).toBe(200)
    expect(mockOrganizationsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_customer_id: "cus_org_123",
        stripe_subscription_id: "sub_org_123",
        subscription_status: "active",
        plan: "pro",
      })
    )
    expect(mockOrganizationsEq).toHaveBeenCalledWith("id", "org-1")
    expect(mockUsersUpdate).not.toHaveBeenCalled()
  })

  it("updates user plan on personal checkout completion", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_user_123",
          customer: "cus_user_123",
          metadata: {
            supabase_user_id: "user-1",
            workspace_owner_type: "user",
          },
        },
      },
    })
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: "price_pro_monthly" } }],
    })

    const response = await POST(makeWebhookRequest("{}"))
    expect(response.status).toBe(200)
    expect(mockUsersUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "pro",
        stripe_customer_id: "cus_user_123",
      })
    )
    expect(mockUsersEq).toHaveBeenCalledWith("id", "user-1")
  })

  it("updates team subscription status with org billing identifiers", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_team_123",
          customer: "cus_org_123",
          status: "past_due",
          metadata: { type: "team_seats", org_id: "org-1" },
          items: { data: [{ price: { id: "price_pro_monthly" } }] },
        },
      },
    })

    const response = await POST(makeWebhookRequest("{}"))
    expect(response.status).toBe(200)
    expect(mockOrganizationsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_status: "past_due",
        stripe_customer_id: "cus_org_123",
        stripe_subscription_id: "sub_team_123",
        plan: "past_due",
      })
    )
    expect(mockOrganizationsEq).toHaveBeenCalledWith("id", "org-1")
  })

  it("returns 200 for unhandled event type", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.created",
      data: { object: {} },
    })

    const response = await POST(makeWebhookRequest("{}"))
    expect(response.status).toBe(200)
  })
})
