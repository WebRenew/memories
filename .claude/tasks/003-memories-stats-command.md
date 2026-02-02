# Task: Add `memories stats` Command

## Priority: Quick Win

## Description
Create a `memories stats` command that shows memory analytics - counts by type, staleness, and usage patterns.

## Why It Matters
- Users can see at a glance how they're using memories
- Identifies stale memories that need cleanup
- Helps understand memory distribution across projects

## Implementation Steps

- [ ] Create `src/commands/stats.ts`
- [ ] Query database for:
  - Total memories (active, deleted)
  - Count by type (rule, decision, fact, note)
  - Count by scope (global, project)
  - Age distribution (last 7d, 30d, 90d, older)
  - Top 5 projects by memory count
  - Top tags
- [ ] Format output with chalk (colorful, easy to read)
- [ ] Add `--json` flag for programmatic use
- [ ] Add command to index.ts

## Example Output

```
📊 Memory Statistics

Total: 47 memories (3 deleted)

By Type:
  📌 Rules:     8
  💡 Decisions: 12
  📋 Facts:     5
  📝 Notes:     22

By Scope:
  🌍 Global:  15
  📁 Project: 32

Age Distribution:
  Last 7 days:  12
  Last 30 days: 28
  Older:        7

Top Projects:
  github.com/user/memories  18 memories
  github.com/user/webapp    14 memories

Top Tags:
  #typescript (12)  #api (8)  #config (5)
```

## Acceptance Criteria

- [ ] `memories stats` shows comprehensive statistics
- [ ] Output is colorful and readable
- [ ] `memories stats --json` outputs JSON
- [ ] Stats are accurate and performant
