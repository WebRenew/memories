# memories.sh

**One Memory, Every AI Tool.**

A local-first memory layer for AI coding agents. Store your coding rules, decisions, and project knowledge once — then generate native config files for Claude Code, Cursor, GitHub Copilot, Windsurf, and more.

## Why

Every AI coding tool has its own instruction format: `CLAUDE.md`, `.cursor/rules/`, `.github/copilot-instructions.md`, and so on. As you add more tools, you end up maintaining the same context in multiple places. **memories.sh** gives you a single source of truth — a local SQLite database of memories — and generates the right files for each tool automatically.

## How It Works

```
memories add "Always use early returns to reduce nesting" --type rule --scope global
memories add "Use Supabase for auth, Stripe for billing" --type decision --scope project
memories generate                 # writes CLAUDE.md, .cursor/rules/, etc.
memories serve                    # starts an MCP server for direct agent access
```

1. **Add** memories — rules, decisions, facts, notes — scoped globally or per-project
2. **Generate** native config files for any supported AI tool
3. **Serve** memories via MCP so agents can query them in real time
4. **Sync** across machines with optional cloud backup (Turso)

## Features

- **Local-first** — SQLite database at `~/.config/memories/local.db`, works offline
- **Full-text search** — FTS5-powered search across all memories
- **Multi-tool generation** — one command outputs configs for Claude, Cursor, Copilot, Windsurf, etc.
- **MCP server** — Model Context Protocol server with 7 tools and 3 resources for direct agent integration
- **Cloud sync** — optional sync via Turso embedded replicas (local speed, cloud backup)
- **Project scoping** — memories can be global or tied to a specific project (detected via git remote)
- **Import/Export** — YAML-based import and export for sharing and backup
- **Git hooks** — auto-generate config files on commit
- **Tagging** — organize memories with tags for flexible retrieval
- **Diff** — compare generated output against existing config files

## Install

```bash
npm install -g @memories.sh/cli
```

Requires Node.js >= 20.

## Quick Start

```bash
# Initialize memories in your project
memories init

# Add some memories
memories add "Use pnpm as the package manager" --type rule
memories add "Prefer server components, minimize client bundles" --type rule --tag react,nextjs
memories add "Chose Supabase over Firebase for better Postgres access" --type decision

# Search your memories
memories search "package manager"

# Generate AI tool configs
memories generate

# Start the MCP server
memories serve
```

## CLI Commands

### Core

| Command | Description |
|---------|-------------|
| `memories init` | Initialize memories in the current project |
| `memories add <content>` | Add a new memory |
| `memories recall` | Get context-aware memories for the current project |
| `memories prompt` | Generate a system prompt from your memories |

### Query

| Command | Description |
|---------|-------------|
| `memories search <query>` | Full-text search across memories |
| `memories list` | List memories with optional filters |

### Management

| Command | Description |
|---------|-------------|
| `memories edit <id>` | Edit an existing memory |
| `memories forget <id>` | Soft-delete a memory |
| `memories tag <id> <tags>` | Add or update tags on a memory |
| `memories generate` | Generate native config files for AI tools |
| `memories export` | Export memories to YAML |
| `memories import <file>` | Import memories from YAML |
| `memories diff` | Compare generated configs against existing files |
| `memories ingest` | Import existing rule files as memories |
| `memories stats` | Show memory statistics |
| `memories doctor` | Check for common issues |
| `memories config` | View or set configuration |
| `memories hook` | Manage git hooks for auto-generation |
| `memories sync` | Sync local database with cloud |
| `memories serve` | Start the MCP server |

### Auth

| Command | Description |
|---------|-------------|
| `memories login` | Authenticate with memories.sh cloud |
| `memories logout` | Remove stored credentials |

## MCP Server

The built-in MCP server lets AI agents interact with your memories directly. Start it with `memories serve` or configure it in your tool's MCP settings.

### Tools

| Tool | Description |
|------|-------------|
| `get_context` | Get relevant memories for the current context |
| `add_memory` | Store a new memory |
| `search_memories` | Full-text search |
| `get_rules` | Get all rule-type memories |
| `list_memories` | List memories with filters |
| `edit_memory` | Update an existing memory |
| `forget_memory` | Soft-delete a memory |

### Resources

| URI | Description |
|-----|-------------|
| `memories://rules` | All rule-type memories |
| `memories://recent` | Recently added memories |
| `memories://project/{id}` | Memories for a specific project |

### Configuration Example (Claude Code)

```json
{
  "mcpServers": {
    "memories": {
      "command": "memories",
      "args": ["serve"]
    }
  }
}
```

## Memory Types

| Type | Use Case |
|------|----------|
| `rule` | Coding standards, style preferences, tool configs |
| `decision` | Architectural decisions and their rationale |
| `fact` | Project facts — stack choices, API keys locations, team conventions |
| `note` | General notes, TODOs, context for future sessions |

## Scopes

- **`global`** — applies to all projects (e.g., "always use TypeScript strict mode")
- **`project`** — applies only to the current project, identified by git remote URL

## Cloud Sync

memories.sh uses [Turso](https://turso.tech) embedded replicas for cloud sync. Your database stays local for speed, with optional remote backup for cross-machine access.

```bash
# Log in to enable cloud features
memories login

# Sync your local database
memories sync
```

## Web Dashboard

The web dashboard at [memories.sh](https://memories.sh) provides:

- Browse and search your memories
- Usage statistics and charts
- Account settings and plan management
- CLI authentication approval

Sign in with GitHub or Google.

## Project Structure

```
memories/
├── packages/
│   ├── cli/                 # @memories.sh/cli — the core CLI tool
│   │   ├── src/
│   │   │   ├── commands/    # 20 CLI commands
│   │   │   ├── lib/         # Core libraries (db, memory, auth, git, turso, config)
│   │   │   └── mcp/         # MCP server implementation
│   │   └── package.json
│   └── web/                 # Next.js marketing site + dashboard
│       ├── src/
│       │   ├── app/         # App Router pages and API routes
│       │   ├── components/  # UI components (shadcn/ui)
│       │   └── lib/         # Auth, Stripe, Supabase, Turso clients
│       └── package.json
├── supabase/                # Database migrations
├── pnpm-workspace.yaml
└── package.json
```

## Tech Stack

**CLI**: Node.js, Commander.js, libSQL/SQLite, MCP SDK, Zod

**Web**: Next.js 15, Tailwind CSS v4, shadcn/ui, Supabase Auth, Turso, Stripe, Framer Motion

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run CLI in watch mode
cd packages/cli && pnpm dev

# Run web dev server
cd packages/web && pnpm dev

# Type check
pnpm typecheck

# Run tests
pnpm test
```

## Environment Variables

Create a `.env` file at the project root:

```env
# Turso (cloud sync)
TURSO_TOKEN=
TURSO_PLATFORM_API_TOKEN=

# Supabase (auth + user management)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (billing)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
STRIPE_PRO_PRICE_ID_ANNUAL=

# npm (publishing)
NODE_TOKEN=
```

## Pricing

| Plan | Price | Includes |
|------|-------|----------|
| **Free** | $0/month | Local-only, unlimited memories, all CLI features |
| **Pro** | $15/month | Cloud sync, web dashboard, cross-machine access |
| **Enterprise** | Contact us | Team features, priority support |

## License

MIT

## Links

- [Website](https://memories.sh)
- [GitHub](https://github.com/WebRenew/memories)
- [npm](https://www.npmjs.com/package/@memories.sh/cli)
