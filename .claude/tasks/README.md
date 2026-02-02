# memories.sh Task Backlog

This directory contains executable task specifications for improving the memories.sh CLI and MCP server.

## Quick Reference

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 001 | [`memories prompt` command](./001-memories-prompt-command.md) | Quick Win | Small |
| 002 | [MCP Resources](./002-mcp-resources.md) | Quick Win | Small |
| 003 | [`memories stats` command](./003-memories-stats-command.md) | Quick Win | Small |
| 004 | [Bulk forget operations](./004-bulk-forget-command.md) | Quick Win | Small |
| 005 | [Rule validation](./005-rule-validation.md) | Quick Win | Medium |
| 006 | [Memory templates](./006-memory-templates.md) | Agent | Medium |
| 007 | [Semantic search](./007-semantic-search.md) | Agent | Large |
| 008 | [Interactive TUI](./008-interactive-tui.md) | User | Large |
| 009 | [Memory linking](./009-memory-linking.md) | User | Medium |
| 010 | [Git commit hooks](./010-git-commit-hooks.md) | Integration | Medium |
| 011 | [IDE rule generation](./011-ide-rule-generation.md) | Integration | Medium |
| 012 | [Shell watch mode](./012-shell-watch-mode.md) | Integration | Medium |
| 013 | [Webhooks](./013-webhooks.md) | Integration | Medium |
| 014 | [Memory versioning](./014-memory-versioning.md) | User | Medium |
| 015 | [Stale memory detection](./015-stale-memory-detection.md) | User | Small |

## Priority Categories

### Quick Wins
Small, high-impact features that can be implemented in a single session:
- 001-005

### Agent Improvements
Features that make memories more useful for AI agents:
- 006: Memory templates
- 007: Semantic search (bigger lift)

### User Improvements
Features that improve the human experience:
- 008: Interactive TUI (bigger lift)
- 009: Memory linking
- 014: Memory versioning
- 015: Stale memory detection

### Integrations
Features that connect memories to other tools:
- 010: Git commit hooks
- 011: IDE rule generation (Cursor, Claude Code)
- 012: Shell watch mode
- 013: Webhooks

## Suggested Execution Order

### Phase 1: Quick Wins (Week 1)
1. 001 - `memories prompt` (immediately useful)
2. 003 - `memories stats` (visibility)
3. 004 - Bulk forget (maintenance)
4. 002 - MCP Resources (agent UX)

### Phase 2: Core Improvements (Week 2-3)
5. 015 - Stale detection (maintenance)
6. 005 - Rule validation (quality)
7. 006 - Memory templates (structure)
8. 009 - Memory linking (context)

### Phase 3: Integrations (Week 3-4)
9. 011 - IDE rule generation (ecosystem)
10. 010 - Git commit hooks (workflow)
11. 013 - Webhooks (automation)

### Phase 4: Advanced Features (Week 5+)
12. 014 - Memory versioning (history)
13. 012 - Shell watch (proactive)
14. 007 - Semantic search (intelligence)
15. 008 - Interactive TUI (experience)

## How to Use These Tasks

Each task file contains:
- **Description**: What the feature does
- **Why It Matters**: Business/user value
- **Implementation Steps**: Checklist of work items
- **Acceptance Criteria**: Definition of done

To execute a task:
1. Read the task file
2. Work through implementation steps
3. Verify acceptance criteria
4. Update README to mark complete

## Contributing

When adding new tasks:
1. Use the next available number
2. Follow the existing format
3. Include clear acceptance criteria
4. Update this README
