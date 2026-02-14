import { join } from "node:path";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SyncTarget {
  dir: string;
  files?: string[];
  pattern?: RegExp;
  recurse?: boolean;
}

// ─── Sync Targets ────────────────────────────────────────────────────────────
// Specific file paths and patterns to sync from each tool directory.
// Only sync: instruction files, commands, skills, rules, and essential configs.

export const SYNC_TARGETS: readonly SyncTarget[] = [
  // .agents - Agent instruction files, commands, tasks, and skills
  { dir: ".agents", files: ["instructions.md", "settings.json"] },
  { dir: ".agents/commands", pattern: /\.md$/ },
  { dir: ".agents/tasks", pattern: /\.(md|txt)$/ },
  { dir: ".agents/skills", pattern: /\.(md|json|yaml|yml|toml|txt)$/, recurse: true },

  // .claude - Claude Code instructions, commands, rules, hooks, and tasks
  { dir: ".claude", files: ["CLAUDE.md", "settings.json", "settings.local.json"] },
  { dir: ".claude/commands", pattern: /\.md$/ },
  { dir: ".claude/rules", pattern: /\.(md|rules)$/ },
  { dir: ".claude/hooks", pattern: /\.(json|sh)$/ },
  { dir: ".claude/tasks", pattern: /\.(md|txt)$/ },
  { dir: ".claude/skills", pattern: /\.(md|json|yaml|yml|toml|txt)$/, recurse: true },

  // .cursor - Cursor rules and MCP config
  { dir: ".cursor", files: ["mcp.json", "rules.md"] },
  { dir: ".cursor/rules", pattern: /\.(md|mdc|txt)$/ },
  { dir: ".cursor/skills", pattern: /\.(md|json|yaml|yml|toml|txt)$/, recurse: true },

  // .codex - Codex config, rules, and tasks
  { dir: ".codex", files: ["config.toml", "AGENTS.md", "instructions.md"] },
  { dir: ".codex/rules", pattern: /\.(md|rules)$/ },
  { dir: ".codex/tasks", pattern: /\.(md|txt)$/ },
  { dir: ".codex/skills", pattern: /\.(md|json|yaml|yml|toml|txt)$/, recurse: true },

  // Kiro config
  { dir: ".kiro/settings", files: ["mcp.json"] },
  { dir: ".kiro/skills", pattern: /\.(md|json|yaml|yml|toml|txt)$/, recurse: true },

  // Kilo config
  { dir: ".kilo", files: ["mcp.json"] },
  { dir: ".kilo/skills", pattern: /\.(md|json|yaml|yml|toml|txt)$/, recurse: true },

  // Trae config
  { dir: ".trae", files: ["mcp.json"] },
  { dir: ".trae/skills", pattern: /\.(md|json|yaml|yml|toml|txt)$/, recurse: true },

  // Antigravity config
  { dir: ".antigravity", files: ["mcp.json", "mcp_config.json"] },
  { dir: ".antigravity/skills", pattern: /\.(md|json|yaml|yml|toml|txt)$/, recurse: true },

  // Goose config
  { dir: ".goose/rules", pattern: /\.(md|txt)$/ },
  { dir: ".goose/skills", pattern: /\.(md|json|yaml|yml|toml|txt)$/, recurse: true },

  // .windsurf - Windsurf rules
  { dir: ".windsurf", files: ["rules.md", "cascade.json"] },
  { dir: ".windsurf/rules", pattern: /\.(md|txt)$/ },
  { dir: ".windsurf/skills", pattern: /\.(md|json|yaml|yml|toml|txt)$/, recurse: true },

  // .cline - Cline rules
  { dir: ".cline", files: ["rules.md", "CLINE.md", "cline_rules.md"] },
  { dir: ".cline/rules", pattern: /\.(md|txt)$/ },
  { dir: ".cline/skills", pattern: /\.(md|json|yaml|yml|toml|txt)$/, recurse: true },

  // .github/copilot - Copilot instructions
  { dir: ".github/copilot", files: ["instructions.md"] },

  // .gemini - Gemini instructions
  { dir: ".gemini", files: ["GEMINI.md", "settings.json"] },
  { dir: ".gemini/skills", pattern: /\.(md|json|yaml|yml|toml|txt)$/, recurse: true },

  // .roo - Roo config and rules
  { dir: ".roo", files: ["config.json", "rules.md"] },
  { dir: ".roo/rules", pattern: /\.(md|txt)$/ },
  { dir: ".roo/skills", pattern: /\.(md|json|yaml|yml|toml|txt)$/, recurse: true },

  // .amp - Amp rules
  { dir: ".amp", files: ["AGENTS.md", "rules.md"] },
  { dir: ".amp/rules", pattern: /\.(md|txt)$/ },
  { dir: ".amp/skills", pattern: /\.(md|json|yaml|yml|toml|txt)$/, recurse: true },

  // .opencode - OpenCode instructions
  { dir: ".", files: ["opencode.json", "opencode.jsonc"] },
  { dir: ".opencode", files: ["instructions.md"] },
  { dir: ".opencode/skills", pattern: /\.(md|json|yaml|yml|toml|txt)$/, recurse: true },

  // .factory - Factory/Droid config
  { dir: ".factory", files: ["config.json", "instructions.md"] },
  { dir: ".factory/droids", pattern: /\.(md|yaml|yml)$/ },
  { dir: ".factory/tasks", pattern: /\.(md|txt)$/ },
  { dir: ".factory/skills", pattern: /\.(md|json|yaml|yml|toml|txt)$/, recurse: true },

  // OpenClaw workspace artifacts
  { dir: ".openclaw/workspace", files: ["AGENTS.md", "SOUL.md", "TOOLS.md", "IDENTITY.md", "USER.md", "HEARTBEAT.md", "BOOTSTRAP.md", "BOOT.md", "MEMORY.md", "memory.md"] },
  { dir: ".openclaw/workspace/memory", pattern: /\.md$/ },
  { dir: ".openclaw/workspace/skills", pattern: /\.(md|json|yaml|yml|toml|txt)$/, recurse: true },
];

// Optional app-level config files. These can include credentials or environment-specific settings.
export const OPTIONAL_CONFIG_TARGETS: readonly SyncTarget[] = [
  { dir: ".config/opencode", files: ["opencode.json"] },
  { dir: ".openclaw", files: ["openclaw.json"] },
];

// ─── Target Helpers ──────────────────────────────────────────────────────────

export function getSyncTargets(includeConfig: boolean): readonly SyncTarget[] {
  return includeConfig
    ? [...SYNC_TARGETS, ...OPTIONAL_CONFIG_TARGETS]
    : SYNC_TARGETS;
}

export function listOptionalConfigPaths(): string[] {
  const paths: string[] = [];
  for (const target of OPTIONAL_CONFIG_TARGETS) {
    if (!target.files) continue;
    for (const file of target.files) {
      paths.push(join(target.dir, file));
    }
  }
  return paths;
}

export const OPTIONAL_CONFIG_PATHS = new Set(listOptionalConfigPaths());

export const OPTIONAL_CONFIG_INTEGRATIONS = new Map<string, string>([
  [join(".config/opencode", "opencode.json"), "opencode"],
  [join(".openclaw", "openclaw.json"), "openclaw"],
]);
