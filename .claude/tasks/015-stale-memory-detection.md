# Task: Stale Memory Detection

## Priority: User Improvement

## Description
Detect and flag memories that haven't been accessed or updated in a long time. Help users maintain memory hygiene.

## Why It Matters
- Old memories may be outdated
- Reduces noise in search results
- Prompts users to review and update context
- Keeps memory database relevant

## Implementation Steps

- [ ] Track access time:
  ```sql
  ALTER TABLE memories ADD COLUMN last_accessed_at TEXT;
  ```
- [ ] Update `last_accessed_at` when memory is:
  - Returned in search results
  - Included in recall output
  - Viewed via MCP tools
- [ ] Create `memories stale` command:
  - List memories not accessed in N days (default: 90)
  - `--days <n>` to customize threshold
  - `--type <type>` to filter by type
- [ ] Add `memories review` command for guided review:
  - Shows stale memories one by one
  - Options: keep, update, delete, skip
- [ ] Add stale count to `memories stats`
- [ ] Optional: Auto-archive very old memories

## Example Output

```bash
$ memories stale --days 60

⏰ Stale Memories (not accessed in 60+ days)

📝 abc123  "Old deployment process"           92 days ago
📋 def456  "Legacy API endpoint format"       75 days ago
💡 ghi789  "Chose MongoDB (since migrated)"   120 days ago

3 stale memories found

Run 'memories review' to clean up interactively
```

## Review Mode

```bash
$ memories review

Reviewing stale memories...

📝 "Old deployment process"
   Last accessed: 92 days ago
   
   [k]eep  [u]pdate  [d]elete  [s]kip  [q]uit
   > d
   
   ✓ Deleted. Next...
```

## Acceptance Criteria

- [ ] Access time tracked for all operations
- [ ] `memories stale` lists old memories
- [ ] `memories review` provides interactive cleanup
- [ ] Configurable staleness threshold
- [ ] Stale count shown in stats
