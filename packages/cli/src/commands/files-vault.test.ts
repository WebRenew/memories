import { describe, it, expect } from "vitest";
import { join } from "node:path";
import {
  sanitizeOptionalConfig,
  hydrateOptionalConfig,
  REDACTED_PLACEHOLDER,
} from "./files-vault.js";

// Use an actual optional config path so the functions don't short-circuit
const OPENCODE_PATH = join(".config/opencode", "opencode.json");

describe("files-vault", () => {
  describe("sanitizeOptionalConfig", () => {
    it("should skip non-optional paths", () => {
      const result = sanitizeOptionalConfig(".claude/CLAUDE.md", '{"api_key": "sk-123"}');
      expect(result.redactions).toBe(0);
      expect(result.content).toContain("sk-123");
      expect(result.secrets).toEqual({});
    });

    it("should redact double-quoted sensitive values", () => {
      const content = `{"api_key": "sk-secret-value"}`;
      const result = sanitizeOptionalConfig(OPENCODE_PATH, content);
      expect(result.redactions).toBe(1);
      expect(result.content).toContain(REDACTED_PLACEHOLDER);
      expect(result.content).not.toContain("sk-secret-value");
      expect(result.secrets["api_key"]).toBe("sk-secret-value");
    });

    it("should redact multiple sensitive values", () => {
      const content = `{"api_key": "key1", "token": "tok1", "name": "safe"}`;
      const result = sanitizeOptionalConfig(OPENCODE_PATH, content);
      expect(result.redactions).toBe(2);
      expect(result.secrets["api_key"]).toBe("key1");
      expect(result.secrets["token"]).toBe("tok1");
      expect(result.content).toContain('"name": "safe"');
    });

    it("should handle single-quoted values", () => {
      const content = `{'token': 'my-secret-token'}`;
      const result = sanitizeOptionalConfig(OPENCODE_PATH, content);
      expect(result.redactions).toBe(1);
      expect(result.secrets["token"]).toBe("my-secret-token");
    });
  });

  describe("hydrateOptionalConfig", () => {
    it("should skip non-optional paths", () => {
      const content = `{"api_key": "${REDACTED_PLACEHOLDER}"}`;
      const result = hydrateOptionalConfig(".cursor/mcp.json", content, { api_key: "restored" });
      expect(result.hydrated).toBe(0);
      expect(result.content).toContain(REDACTED_PLACEHOLDER);
    });

    it("should replace placeholders with secrets", () => {
      const content = `{"api_key": "${REDACTED_PLACEHOLDER}"}`;
      const result = hydrateOptionalConfig(OPENCODE_PATH, content, { api_key: "my-key" });
      expect(result.hydrated).toBe(1);
      expect(result.content).toContain('"my-key"');
      expect(result.content).not.toContain(REDACTED_PLACEHOLDER);
    });

    it("should skip empty secrets", () => {
      const content = `{"api_key": "${REDACTED_PLACEHOLDER}"}`;
      const result = hydrateOptionalConfig(OPENCODE_PATH, content, { api_key: "" });
      expect(result.hydrated).toBe(0);
      expect(result.content).toContain(REDACTED_PLACEHOLDER);
    });
  });

  describe("round-trip", () => {
    it("should restore original content after sanitize then hydrate", () => {
      const original = `{"api_key": "sk-abc123", "password": "hunter2", "name": "test"}`;
      const sanitized = sanitizeOptionalConfig(OPENCODE_PATH, original);
      expect(sanitized.redactions).toBe(2);

      const hydrated = hydrateOptionalConfig(OPENCODE_PATH, sanitized.content, sanitized.secrets);
      expect(hydrated.hydrated).toBe(2);
      expect(hydrated.content).toBe(original);
    });
  });
});
