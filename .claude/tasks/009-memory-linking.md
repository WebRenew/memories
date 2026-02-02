# Task: Add Memory Linking

## Priority: User Improvement

## Description
Allow users to link related memories together. When one memory is retrieved, related memories can be suggested or included.

## Why It Matters
- Decisions often relate to other decisions
- Facts support rules
- Context is richer when connections are visible
- AI agents can follow links for deeper understanding

## Implementation Steps

- [ ] Update database schema:
  ```sql
  CREATE TABLE memory_links (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    link_type TEXT NOT NULL DEFAULT 'related',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (source_id) REFERENCES memories(id),
    FOREIGN KEY (target_id) REFERENCES memories(id)
  );
  ```
- [ ] Link types: `related`, `supports`, `supersedes`, `contradicts`
- [ ] Create `src/commands/link.ts`:
  - `memories link <id1> <id2>` - create link
  - `memories link <id1> <id2> --type supports` - typed link
  - `memories unlink <id1> <id2>` - remove link
- [ ] Update `memories recall` to show related memories
- [ ] Add `--follow-links` flag to search
- [ ] Update MCP tools to include links in output
- [ ] Visualize links in TUI (if built)

## Example Usage

```bash
# Link a decision to the rule it supports
memories link abc123 def456 --type supports

# View memory with its links
memories show abc123 --links

# Output:
# 📌 Always use TypeScript strict mode
# 
# Linked memories:
#   ← supports: 💡 Chose TypeScript for type safety
#   → related:  📋 tsconfig.json strict options
```

## Acceptance Criteria

- [ ] `memories link` creates bidirectional links
- [ ] Links have types (related, supports, etc.)
- [ ] `memories show --links` displays linked memories
- [ ] Links included in `recall` output
- [ ] `memories unlink` removes links
