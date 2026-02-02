# Task: Add Rule Validation & Conflict Detection

## Priority: Quick Win

## Description
Add a `memories validate` command that checks for conflicting or duplicate rules, and warns when adding rules that might conflict.

## Why It Matters
- Prevents contradictory rules (e.g., "use tabs" vs "use spaces")
- Catches duplicate rules that waste context tokens
- Improves overall memory quality

## Implementation Steps

- [ ] Create `src/commands/validate.ts`
- [ ] Implement conflict detection:
  - Exact duplicates (same content)
  - Near duplicates (high similarity)
  - Semantic conflicts (opposite instructions)
- [ ] Use simple heuristics for now:
  - Levenshtein distance for similarity
  - Keyword-based conflict detection (e.g., "always" vs "never" + same topic)
- [ ] Add `--fix` flag to interactively resolve conflicts
- [ ] Warn on `memories add --rule` if potential conflict detected
- [ ] Add command to index.ts

## Example Output

```
🔍 Validating rules...

⚠️  Potential Conflicts Found:

1. Possible duplicate:
   📌 "Always use TypeScript strict mode"
   📌 "Use TypeScript with strict mode enabled"
   → Consider merging these rules

2. Possible conflict:
   📌 "Use tabs for indentation"
   📌 "Use 2-space indentation"
   → These rules may contradict each other

✅ 6 rules validated, 2 issues found
```

## Acceptance Criteria

- [ ] `memories validate` detects duplicate rules
- [ ] `memories validate` detects potential conflicts
- [ ] Warning shown when adding potentially conflicting rule
- [ ] `--fix` flag allows interactive resolution
