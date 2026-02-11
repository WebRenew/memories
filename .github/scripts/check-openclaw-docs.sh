#!/usr/bin/env bash
set -euo pipefail

OPENCLAW_DOC="packages/web/content/docs/integrations/openclaw.mdx"
INTEGRATIONS_INDEX="packages/web/content/docs/integrations/index.mdx"

require_literal() {
  local file="$1"
  local needle="$2"
  local label="$3"

  if ! grep -Fq "$needle" "$file"; then
    echo "OpenClaw docs guard failed: missing ${label}" >&2
    echo "Expected literal: ${needle}" >&2
    echo "File: ${file}" >&2
    exit 1
  fi
}

require_literal "$OPENCLAW_DOC" "openclaw onboard" "onboarding command"
require_literal "$OPENCLAW_DOC" "~/.openclaw/workspace/AGENTS.md" "workspace AGENTS.md path"
require_literal "$OPENCLAW_DOC" "memories generate claude -o ~/.openclaw/workspace/AGENTS.md --force" "forced AGENTS.md generation command"
require_literal "$OPENCLAW_DOC" "if [ -d .agents/skills ]; then" "conditional skills copy guard"
require_literal "$OPENCLAW_DOC" "do not document a project-level MCP config path like \`.openclaw/mcp.json\`" "explicit no-mcp.json guidance"

require_literal "$INTEGRATIONS_INDEX" "| [OpenClaw](/docs/integrations/openclaw) | \`~/.openclaw/workspace/AGENTS.md\` + \`~/.openclaw/workspace/skills/\` | No | No |" "integrations index OpenClaw row"

echo "OpenClaw docs guard passed."
