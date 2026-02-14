import { describe, it, expect } from "vitest";
import { listTemplates, getTemplate } from "../lib/templates.js";

describe("template", () => {
  it("should list available templates", () => {
    const templates = listTemplates();
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
  });

  it("should return template by name", () => {
    const templates = listTemplates();
    const firstName = templates[0].name;
    const template = getTemplate(firstName);

    expect(template).toBeDefined();
    expect(template!.name).toBe(firstName);
    expect(template!.fields).toBeDefined();
    expect(Array.isArray(template!.fields)).toBe(true);
  });

  it("should return undefined for non-existent template", () => {
    const template = getTemplate("nonexistent-template-xyz");
    expect(template).toBeUndefined();
  });

  it("should have valid type on each template", () => {
    const validTypes = ["rule", "decision", "fact", "note", "skill"];
    const templates = listTemplates();
    for (const t of templates) {
      expect(validTypes).toContain(t.type);
    }
  });

  it("should have description on each template", () => {
    const templates = listTemplates();
    for (const t of templates) {
      expect(t.description).toBeTruthy();
      expect(typeof t.description).toBe("string");
    }
  });
});
