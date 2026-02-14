import type { AddMemoryOpts } from "../lib/memory.js";

interface MemoryScopeInput {
  global?: boolean;
  project_id?: string | null;
}

function normalizeProjectId(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Resolve MCP tool scope inputs into addMemory/startMemoryStream options.
 */
export function resolveMemoryScopeInput(
  input: MemoryScopeInput
): Pick<AddMemoryOpts, "global" | "projectId"> {
  const projectId = normalizeProjectId(input.project_id);

  if (input.global && projectId) {
    throw new Error("Cannot set both global=true and project_id. Choose one scope.");
  }

  if (input.global) {
    return { global: true };
  }

  if (projectId) {
    return { projectId };
  }

  return {};
}
