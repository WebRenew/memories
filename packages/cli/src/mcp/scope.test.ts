import { describe, expect, it } from "vitest";
import { resolveMemoryScopeInput } from "./scope.js";

describe("resolveMemoryScopeInput", () => {
  it("returns global scope when global=true", () => {
    const result = resolveMemoryScopeInput({ global: true });
    expect(result).toEqual({ global: true });
  });

  it("returns project scope when project_id is provided", () => {
    const result = resolveMemoryScopeInput({
      project_id: " github.com/webrenew/memories ",
    });
    expect(result).toEqual({ projectId: "github.com/webrenew/memories" });
  });

  it("returns empty object when neither global nor project_id is set", () => {
    const result = resolveMemoryScopeInput({});
    expect(result).toEqual({});
  });

  it("treats blank project_id as unset", () => {
    const result = resolveMemoryScopeInput({ project_id: "   " });
    expect(result).toEqual({});
  });

  it("throws when both global and project_id are provided", () => {
    expect(() =>
      resolveMemoryScopeInput({
        global: true,
        project_id: "github.com/webrenew/memories",
      })
    ).toThrow(/both global=true and project_id/i);
  });
});
