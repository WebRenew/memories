import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Use a temp directory so tests never hit sync
process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-test-"));

import {
  addMemory,
  searchMemories,
  listMemories,
  forgetMemory,
  updateMemory,
  getRules,
  getContext,
  findMemoriesToForget,
  bulkForgetByIds,
  vacuumMemories,
} from "./memory.js";

describe("memory", () => {
  it("should add a memory", async () => {
    const memory = await addMemory("test memory content", {
      tags: ["test", "smoke"],
    });
    expect(memory.id).toBeDefined();
    expect(memory.content).toBe("test memory content");
    expect(memory.tags).toBe("test,smoke");
  });

  it("should search memories by content", async () => {
    await addMemory("searchable unique phrase");
    const results = await searchMemories("searchable unique");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain("searchable unique");
  });

  it("should list memories", async () => {
    const results = await listMemories();
    expect(results.length).toBeGreaterThan(0);
  });

  it("should list memories filtered by tags", async () => {
    await addMemory("tagged item", { tags: ["filtertest"] });
    const results = await listMemories({ tags: ["filtertest"] });
    expect(results.length).toBeGreaterThan(0);
  });

  it("should soft-delete a memory", async () => {
    const memory = await addMemory("to be forgotten");
    const deleted = await forgetMemory(memory.id);
    expect(deleted).toBe(true);

    const results = await searchMemories("to be forgotten");
    expect(results.length).toBe(0);
  });

  it("should return false when forgetting non-existent id", async () => {
    const deleted = await forgetMemory("nonexistent");
    expect(deleted).toBe(false);
  });

  it("should add global memory when global flag is true", async () => {
    const memory = await addMemory("global preference", { global: true });
    expect(memory.scope).toBe("global");
    expect(memory.project_id).toBeNull();
  });

  it("should add project memory when projectId is provided", async () => {
    const memory = await addMemory("project specific", {
      projectId: "github.com/test/repo",
    });
    expect(memory.scope).toBe("project");
    expect(memory.project_id).toBe("github.com/test/repo");
  });

  it("should filter memories by scope", async () => {
    // Add global and project memories
    await addMemory("scope-test global", { global: true, tags: ["scope-test"] });
    await addMemory("scope-test project", { projectId: "github.com/scope/test", tags: ["scope-test"] });

    // List with only project scope
    const projectOnly = await listMemories({
      projectId: "github.com/scope/test",
      includeGlobal: false,
      tags: ["scope-test"],
    });
    expect(projectOnly.every((m) => m.scope === "project")).toBe(true);

    // List with both scopes
    const both = await listMemories({
      projectId: "github.com/scope/test",
      includeGlobal: true,
      tags: ["scope-test"],
    });
    expect(both.some((m) => m.scope === "global")).toBe(true);
    expect(both.some((m) => m.scope === "project")).toBe(true);
  });

  // ─── updateMemory ──────────────────────────────────────────────────────────

  describe("updateMemory", () => {
    it("should update content", async () => {
      const memory = await addMemory("original content");
      const updated = await updateMemory(memory.id, { content: "new content" });
      expect(updated).not.toBeNull();
      expect(updated!.content).toBe("new content");
    });

    it("should update tags", async () => {
      const memory = await addMemory("tag update test", { tags: ["old"] });
      const updated = await updateMemory(memory.id, { tags: ["new", "tags"] });
      expect(updated!.tags).toBe("new,tags");
    });

    it("should update type", async () => {
      const memory = await addMemory("type update test");
      const updated = await updateMemory(memory.id, { type: "rule" });
      expect(updated!.type).toBe("rule");
    });

    it("should update paths", async () => {
      const memory = await addMemory("paths update test");
      const updated = await updateMemory(memory.id, { paths: ["src/**", "lib/**"] });
      expect(updated!.paths).toBe("src/**,lib/**");
    });

    it("should set and clear category", async () => {
      const memory = await addMemory("category test");
      const updated = await updateMemory(memory.id, { category: "testing" });
      expect(updated!.category).toBe("testing");

      const cleared = await updateMemory(memory.id, { category: null });
      expect(cleared!.category).toBeNull();
    });

    it("should set and clear metadata", async () => {
      const memory = await addMemory("metadata test");
      const updated = await updateMemory(memory.id, { metadata: { key: "value" } });
      expect(JSON.parse(updated!.metadata as string)).toEqual({ key: "value" });

      const cleared = await updateMemory(memory.id, { metadata: null });
      expect(cleared!.metadata).toBeNull();
    });

    it("should return null for non-existent id", async () => {
      const result = await updateMemory("nonexistent-id", { content: "nope" });
      expect(result).toBeNull();
    });

    it("should return null for deleted memory", async () => {
      const memory = await addMemory("will be deleted for update test");
      await forgetMemory(memory.id);
      const result = await updateMemory(memory.id, { content: "nope" });
      expect(result).toBeNull();
    });
  });

  // ─── getRules ──────────────────────────────────────────────────────────────

  describe("getRules", () => {
    it("should return only rule-type memories", async () => {
      await addMemory("a rule", { type: "rule", global: true, tags: ["rules-test"] });
      await addMemory("a note", { type: "note", global: true, tags: ["rules-test"] });

      const rules = await getRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((r) => r.type === "rule")).toBe(true);
    });

    it("should include both global and project rules", async () => {
      const pid = "github.com/rules/test";
      await addMemory("global rule for test", { type: "rule", global: true, tags: ["rules-scope"] });
      await addMemory("project rule for test", { type: "rule", projectId: pid, tags: ["rules-scope"] });

      const rules = await getRules({ projectId: pid });
      const scopes = rules.map((r) => r.scope);
      expect(scopes).toContain("global");
      expect(scopes).toContain("project");
    });
  });

  // ─── getContext ────────────────────────────────────────────────────────────

  describe("getContext", () => {
    it("should return rules and memories", async () => {
      await addMemory("context rule", { type: "rule", global: true });
      await addMemory("context note about widgets");

      const ctx = await getContext("widgets");
      expect(ctx.rules.length).toBeGreaterThan(0);
      expect(ctx.rules.every((r) => r.type === "rule")).toBe(true);
    });

    it("should return empty memories when no query", async () => {
      const ctx = await getContext();
      expect(ctx.memories).toEqual([]);
      expect(ctx.rules.length).toBeGreaterThan(0);
    });

    it("should exclude rules from memories search", async () => {
      const ctx = await getContext("rule");
      for (const m of ctx.memories) {
        expect(m.type).not.toBe("rule");
      }
    });
  });

  // ─── findMemoriesToForget ──────────────────────────────────────────────────

  describe("findMemoriesToForget", () => {
    it("should filter by type", async () => {
      await addMemory("bulk fact", { type: "fact", tags: ["bulk-type"] });
      await addMemory("bulk decision", { type: "decision", tags: ["bulk-type"] });

      const results = await findMemoriesToForget({ types: ["fact"] });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((m) => m.type === "fact")).toBe(true);
    });

    it("should filter by tag substring", async () => {
      await addMemory("bulk tag item", { tags: ["bulk-unique-tag"] });
      const results = await findMemoriesToForget({ tags: ["bulk-unique-tag"] });
      expect(results.length).toBeGreaterThan(0);
    });

    it("should filter by content pattern", async () => {
      await addMemory("xyzzy magic word");
      const results = await findMemoriesToForget({ pattern: "xyzzy*" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain("xyzzy");
    });
  });

  // ─── bulkForgetByIds ──────────────────────────────────────────────────────

  describe("bulkForgetByIds", () => {
    it("should soft-delete multiple memories", async () => {
      const m1 = await addMemory("bulk forget 1");
      const m2 = await addMemory("bulk forget 2");

      const count = await bulkForgetByIds([m1.id, m2.id]);
      expect(count).toBe(2);

      const results = await searchMemories("bulk forget");
      const ids = results.map((r) => r.id);
      expect(ids).not.toContain(m1.id);
      expect(ids).not.toContain(m2.id);
    });

    it("should return 0 for empty array", async () => {
      const count = await bulkForgetByIds([]);
      expect(count).toBe(0);
    });
  });

  // ─── vacuumMemories ──────────────────────────────────────────────────────

  describe("vacuumMemories", () => {
    it("should permanently remove soft-deleted records", async () => {
      const memory = await addMemory("vacuum target");
      await forgetMemory(memory.id);

      const purged = await vacuumMemories();
      expect(purged).toBeGreaterThan(0);
    });
  });
});
