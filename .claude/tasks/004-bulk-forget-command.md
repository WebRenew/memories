# Task: Add Bulk Forget Operations

## Priority: Quick Win

## Description
Extend the `forget` command to support bulk operations - forget by type, tag, age, or pattern.

## Why It Matters
- Cleaning up old test memories is currently tedious
- Teams need to remove deprecated rules efficiently
- Enables memory hygiene workflows

## Implementation Steps

- [ ] Extend `src/commands/forget.ts` to support filters
- [ ] Add options:
  - `--type <type>` - Forget all of a specific type
  - `--tag <tag>` - Forget all with a specific tag
  - `--older-than <days>` - Forget memories older than N days
  - `--pattern <regex>` - Forget memories matching pattern
  - `--all` - Forget all (requires confirmation)
- [ ] Add `--dry-run` flag to preview what would be deleted
- [ ] Add confirmation prompt for bulk deletes (unless `--force`)
- [ ] Update `lib/memory.ts` with `forgetMemories(filter)` function
- [ ] Add tests

## Example Usage

```bash
# Preview what would be deleted
memories forget --type note --older-than 90 --dry-run

# Delete all notes older than 90 days
memories forget --type note --older-than 90

# Delete all memories with deprecated tag
memories forget --tag deprecated --force

# Delete memories matching pattern
memories forget --pattern "test.*" --dry-run
```

## Acceptance Criteria

- [ ] `memories forget --type note` deletes all notes
- [ ] `memories forget --older-than 30` deletes old memories
- [ ] `--dry-run` shows preview without deleting
- [ ] Confirmation prompt for bulk operations
- [ ] `--force` skips confirmation
