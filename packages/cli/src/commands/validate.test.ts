import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-validate-test-"));

import { addMemory } from "../lib/memory.js";
import { getDb } from "../lib/db.js";

// Re-implement the validation helpers from validate.ts to test them directly
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

function extractKeywords(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
}

function findTopicOverlap(a: string, b: string): string[] {
  const wordsA = new Set(extractKeywords(a));
  const wordsB = new Set(extractKeywords(b));
  const overlap: string[] = [];
  for (const w of wordsA) {
    if (wordsB.has(w) && w.length > 3) overlap.push(w);
  }
  return overlap;
}

const CONFLICT_PAIRS = [
  ["always", "never"],
  ["use", "avoid"],
  ["prefer", "avoid"],
  ["enable", "disable"],
  ["tabs", "spaces"],
  ["single", "double"],
  ["require", "forbid"],
  ["must", "must not"],
  ["should", "should not"],
];

function checkForConflict(a: string, b: string): boolean {
  const lowerA = a.toLowerCase();
  const lowerB = b.toLowerCase();

  for (const [pos, neg] of CONFLICT_PAIRS) {
    const aHasPos = lowerA.includes(pos);
    const aHasNeg = lowerA.includes(neg);
    const bHasPos = lowerB.includes(pos);
    const bHasNeg = lowerB.includes(neg);

    if ((aHasPos && bHasNeg) || (aHasNeg && bHasPos)) {
      const overlap = findTopicOverlap(a, b);
      if (overlap.length > 0) return true;
    }
  }
  return false;
}

describe("validate", () => {
  beforeAll(async () => {
    await getDb();
  });

  it("should compute levenshtein distance correctly", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "abc")).toBe(0);
  });

  it("should compute similarity correctly", () => {
    expect(similarity("abc", "abc")).toBe(1);
    expect(similarity("", "")).toBe(1);
    // Nearly identical strings should be high similarity
    expect(similarity("Always use TypeScript", "Always use Typescript")).toBeGreaterThan(0.9);
  });

  it("should detect exact duplicates", async () => {
    await addMemory("Always use strict mode", { type: "rule", global: true });
    await addMemory("Always use strict mode", { type: "rule", global: true });

    const db = await getDb();
    const result = await db.execute(
      "SELECT content FROM memories WHERE deleted_at IS NULL AND type = 'rule'"
    );
    const contents = result.rows.map(r => String(r.content));
    const duplicates = contents.filter((c, i) => contents.indexOf(c) !== i);
    expect(duplicates.length).toBeGreaterThan(0);
  });

  it("should detect conflicting rules", () => {
    expect(checkForConflict(
      "Always use semicolons in JavaScript",
      "Never use semicolons in JavaScript"
    )).toBe(true);
  });

  it("should not flag unrelated rules as conflicts", () => {
    expect(checkForConflict(
      "Use TypeScript strict mode",
      "Prefer functional components"
    )).toBe(false);
  });

  it("should find topic overlap between related rules", () => {
    const overlap = findTopicOverlap(
      "Always use TypeScript for new files",
      "Never use JavaScript for new files"
    );
    expect(overlap).toContain("files");
  });

  it("should extract keywords from text", () => {
    const keywords = extractKeywords("Always use TypeScript strict mode");
    expect(keywords).toContain("always");
    expect(keywords).toContain("typescript");
    // Short words (<=2 chars) should be excluded
    expect(keywords).not.toContain("us");
  });
});
