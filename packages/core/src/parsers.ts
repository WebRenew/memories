import type { ContextResult, MemoryRecord, MemoryType } from "./types"

const MEMORY_LINE_REGEX =
  /^\[(?<type>[^\]]+)\]\s+(?<content>.+?)\s+\((?<scope>[^)]+)\)(?:\s+\[(?<tags>.+)\])?$/

function normalizeMemoryType(value: string): MemoryType {
  const normalized = value.trim().toLowerCase()
  if (
    normalized === "rule" ||
    normalized === "decision" ||
    normalized === "fact" ||
    normalized === "note" ||
    normalized === "skill"
  ) {
    return normalized
  }
  return "note"
}

function normalizeScope(scope: string): Pick<MemoryRecord, "scope" | "projectId"> {
  const trimmed = scope.trim()
  if (trimmed === "global") {
    return { scope: "global", projectId: null }
  }
  if (trimmed.startsWith("@")) {
    return { scope: "project", projectId: trimmed.slice(1) || null }
  }
  return { scope: "unknown", projectId: null }
}

function parseMemoryLine(line: string): MemoryRecord | null {
  const trimmed = line.trim()
  const withoutBullet = trimmed.startsWith("- ") ? trimmed.slice(2).trim() : trimmed
  const match = MEMORY_LINE_REGEX.exec(withoutBullet)
  if (!match?.groups) return null

  const { type, content, scope, tags } = match.groups
  const normalizedScope = normalizeScope(scope)
  return {
    id: null,
    content: content.trim(),
    type: normalizeMemoryType(type),
    scope: normalizedScope.scope,
    projectId: normalizedScope.projectId,
    tags: tags ? tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
    raw: withoutBullet,
  }
}

function parseSections(raw: string): Map<string, string[]> {
  const sections = new Map<string, string[]>()
  let currentSection: string | null = null

  for (const line of raw.split(/\r?\n/)) {
    const heading = /^##\s+(.+)$/.exec(line.trim())
    if (heading) {
      currentSection = heading[1].trim()
      if (!sections.has(currentSection)) {
        sections.set(currentSection, [])
      }
      continue
    }

    if (!currentSection) continue
    const sectionLines = sections.get(currentSection)
    if (!sectionLines) continue

    if (line.trim().length > 0) {
      sectionLines.push(line)
    }
  }

  return sections
}

export function parseContextResponse(raw: string): ContextResult {
  const sections = parseSections(raw)

  const projectRules = sections.get("Project Rules") ?? []
  const globalRules = sections.get("Global Rules") ?? []
  const relevantMemories = sections.get("Relevant Memories") ?? []

  const rules: MemoryRecord[] = []
  let ruleIndex = 0

  for (const [scope, lines] of [
    ["project", projectRules] as const,
    ["global", globalRules] as const,
  ]) {
    for (const line of lines) {
      const content = line.replace(/^- /, "").trim()
      if (!content) continue

      ruleIndex += 1
      rules.push({
        id: `rule_${ruleIndex}`,
        content,
        type: "rule",
        scope,
        projectId: null,
        tags: [],
        raw: line.trim(),
      })
    }
  }

  const memories = relevantMemories
    .map(parseMemoryLine)
    .filter((record): record is MemoryRecord => record !== null)

  return {
    rules,
    memories,
    raw,
  }
}

export function parseMemoryListResponse(raw: string): MemoryRecord[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ["))
    .map(parseMemoryLine)
    .filter((record): record is MemoryRecord => record !== null)
}
