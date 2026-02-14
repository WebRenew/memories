import { describe, it, expect } from "vitest";

// Re-implement pure functions from login.ts for testing
function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeApiUrl(value: string): string {
  const trimmed = value.trim();
  try {
    const parsed = new URL(trimmed);
    return `${parsed.origin}${stripTrailingSlash(parsed.pathname)}`;
  } catch {
    return stripTrailingSlash(trimmed);
  }
}

describe("login", () => {
  it("should strip trailing slashes from API URL", () => {
    expect(stripTrailingSlash("https://memories.sh/")).toBe("https://memories.sh");
    expect(stripTrailingSlash("https://memories.sh///")).toBe("https://memories.sh");
    expect(stripTrailingSlash("https://memories.sh")).toBe("https://memories.sh");
  });

  it("should normalize API URLs consistently", () => {
    expect(normalizeApiUrl("https://memories.sh/")).toBe("https://memories.sh");
    expect(normalizeApiUrl("  https://memories.sh  ")).toBe("https://memories.sh");
    expect(normalizeApiUrl("https://memories.sh/api/")).toBe("https://memories.sh/api");
  });

  it("should handle invalid URLs gracefully", () => {
    // Falls back to stripTrailingSlash when URL parsing fails
    const result = normalizeApiUrl("not-a-url/");
    expect(result).toBe("not-a-url");
  });

  it("should detect non-default API URL", () => {
    const DEFAULT_API_URL = "https://memories.sh";
    const customUrl = "https://custom.example.com";
    const normalizedDefault = normalizeApiUrl(DEFAULT_API_URL);
    const normalizedCustom = normalizeApiUrl(customUrl);
    expect(normalizedDefault).not.toBe(normalizedCustom);
  });

  it("should treat default URL variations as the same", () => {
    const a = normalizeApiUrl("https://memories.sh");
    const b = normalizeApiUrl("https://memories.sh/");
    const c = normalizeApiUrl("  https://memories.sh  ");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});
