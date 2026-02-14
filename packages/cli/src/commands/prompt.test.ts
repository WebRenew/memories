import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-prompt-test-"));

import { addMemory, getRules, listMemories, type Memory } from "../lib/memory.js";
import { getDb } from "../lib/db.js";

// Re-implement format functions from prompt.ts to test them
function formatMarkdown(sections: { title: string; memories: Memory[] }[]): string {
  return sections
    .map(({ title, memories }) => {
      const items = memories.map((m) => `- ${m.content}`).join("\n");
      return `## ${title}\n\n${items}`;
    })
    .join("\n\n");
}

function formatXml(sections: { title: string; memories: Memory[] }[]): string {
  return sections
    .map(({ title, memories }) => {
      const tag = title.toLowerCase().replace(/\s+/g, "-");
      const items = memories.map((m) => `  <item>${m.content}</item>`).join("\n");
      return `<${tag}>\n${items}\n</${tag}>`;
    })
    .join("\n");
}

function formatPlain(sections: { title: string; memories: Memory[] }[]): string {
  return sections
    .flatMap(({ memories }) => memories.map((m) => m.content))
    .join("\n");
}

describe("prompt", () => {
  beforeAll(async () => {
    await getDb();
    await addMemory("Always use TypeScript strict mode", { type: "rule", global: true });
    await addMemory("Prefer early returns", { type: "rule", global: true });
    await addMemory("Chose PostgreSQL for JSONB support", { type: "decision", global: true });
  });

  it("should format rules as markdown", async () => {
    const rules = await getRules({});
    const sections = [{ title: "Rules", memories: rules }];
    const output = formatMarkdown(sections);

    expect(output).toContain("## Rules");
    expect(output).toContain("- Always use TypeScript strict mode");
    expect(output).toContain("- Prefer early returns");
  });

  it("should format rules as XML", async () => {
    const rules = await getRules({});
    const sections = [{ title: "Rules", memories: rules }];
    const output = formatXml(sections);

    expect(output).toContain("<rules>");
    expect(output).toContain("</rules>");
    expect(output).toContain("<item>Always use TypeScript strict mode</item>");
  });

  it("should format rules as plain text", async () => {
    const rules = await getRules({});
    const sections = [{ title: "Rules", memories: rules }];
    const output = formatPlain(sections);

    expect(output).toContain("Always use TypeScript strict mode");
    expect(output).not.toContain("##");
    expect(output).not.toContain("<");
  });

  it("should include multiple sections when additional types requested", async () => {
    const rules = await getRules({});
    const decisions = await listMemories({ types: ["decision"] });
    const sections = [
      { title: "Rules", memories: rules },
      { title: "Key Decisions", memories: decisions },
    ];
    const output = formatMarkdown(sections);

    expect(output).toContain("## Rules");
    expect(output).toContain("## Key Decisions");
    expect(output).toContain("Chose PostgreSQL");
  });
});
