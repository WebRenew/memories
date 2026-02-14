import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-recall-test-"));

import { addMemory, getContext, getRules } from "../lib/memory.js";
import { getDb } from "../lib/db.js";

describe("recall", () => {
  beforeAll(async () => {
    await getDb();
    await addMemory("Always use TypeScript", { type: "rule", global: true });
    await addMemory("Prefer functional components", { type: "rule", global: true });
    await addMemory("API limit is 100/min", { type: "fact", global: true });
    await addMemory("Chose React over Vue", { type: "decision", global: true });
  });

  it("should return rules via getRules", async () => {
    const rules = await getRules({});
    expect(rules.length).toBe(2);
    for (const r of rules) {
      expect(r.type).toBe("rule");
    }
  });

  it("should return context with rules and relevant memories", async () => {
    const { rules, memories } = await getContext("API", { limit: 10 });
    expect(rules.length).toBe(2);
    expect(memories.length).toBeGreaterThan(0);
  });

  it("should return context without query", async () => {
    const { rules, memories } = await getContext(undefined, { limit: 10 });
    expect(rules.length).toBe(2);
    // Without query, memories may be empty or contain recent non-rule memories
    expect(Array.isArray(memories)).toBe(true);
  });
});
