import { describe, it, expect } from "vitest";

// Re-implement pure utility from sync.ts for testing
function inferDbName(syncUrl: string | undefined): string | null {
  if (!syncUrl) return null;
  try {
    const host = new URL(syncUrl.replace("libsql://", "https://")).hostname;
    const firstLabel = host.split(".")[0];
    return firstLabel || null;
  } catch {
    return null;
  }
}

describe("sync", () => {
  it("should infer database name from libsql URL", () => {
    const dbName = inferDbName("libsql://my-db-name.turso.io");
    expect(dbName).toBe("my-db-name");
  });

  it("should infer database name from https URL", () => {
    const dbName = inferDbName("https://my-db.turso.io");
    expect(dbName).toBe("my-db");
  });

  it("should return null for undefined URL", () => {
    expect(inferDbName(undefined)).toBeNull();
  });

  it("should return null for invalid URL", () => {
    expect(inferDbName("not-a-url")).toBeNull();
  });

  it("should handle complex hostnames", () => {
    const dbName = inferDbName("libsql://memories-prod-abc123.turso.io");
    expect(dbName).toBe("memories-prod-abc123");
  });
});
