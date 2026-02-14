import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCloudCredentials } from "./serve.js";

const originalFetch = globalThis.fetch;

describe("serve - fetchCloudCredentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetches cloud credentials and returns values", async () => {
    const body = { turso_db_url: "libsql://db.turso.io", turso_db_token: "tok_123" };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchCloudCredentials("test-api-key-123");
    expect(result).toEqual({ turso_db_url: "libsql://db.turso.io", turso_db_token: "tok_123" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toMatch(/\/api\/db\/credentials$/);
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer test-api-key-123");
  });

  it("throws when server responds with error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("forbidden", { status: 403 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(fetchCloudCredentials("bad")).rejects.toThrow(/Failed to fetch credentials: 403/i);
  });

  it("throws when credentials are incomplete", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(fetchCloudCredentials("any")).rejects.toThrow(/Database not provisioned/i);
  });
});
