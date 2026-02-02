# Task: Add Memory Version History

## Priority: User Improvement

## Description
Track changes to memories over time. When a memory is updated, keep the history so users can see how context evolved.

## Why It Matters
- Rules evolve over time
- Understand why something changed
- Revert accidental changes
- Audit trail for team decisions

## Implementation Steps

- [ ] Create history table:
  ```sql
  CREATE TABLE memory_history (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    type TEXT NOT NULL,
    changed_at TEXT NOT NULL DEFAULT (datetime('now')),
    change_type TEXT NOT NULL, -- 'created', 'updated', 'deleted'
    FOREIGN KEY (memory_id) REFERENCES memories(id)
  );
  ```
- [ ] Create triggers to auto-record history on changes
- [ ] Add `memories history <id>` command to view history
- [ ] Add `memories revert <id> --to <version>` command
- [ ] Add `--history` flag to `memories show`
- [ ] Update MCP to support history queries

## Example Output

```bash
$ memories history abc123

📌 Always use TypeScript strict mode

History:
┌──────────────────────────────────────────────────────┐
│ v3 (current)  2024-01-15  "Always use TypeScript..." │
│ v2            2024-01-10  "Use TypeScript strict..." │
│ v1            2024-01-05  "Enable strict mode in..." │
└──────────────────────────────────────────────────────┘

$ memories revert abc123 --to v2
✓ Reverted memory abc123 to version 2
```

## Acceptance Criteria

- [ ] History recorded on every memory change
- [ ] `memories history <id>` shows version history
- [ ] `memories revert` restores previous version
- [ ] History survives soft-delete and restore
- [ ] Efficient storage (don't duplicate unchanged fields)
