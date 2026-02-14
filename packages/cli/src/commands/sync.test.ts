import { describe, it, expect } from "vitest";
import { inferDbName } from "./sync.js";

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
