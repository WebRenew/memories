# Task: Git Commit Hook Integration

## Priority: Integration

## Description
Automatically extract decisions and facts from commit messages using a git hook. When commits contain `[decision]` or `[fact]` tags, automatically create memories.

## Why It Matters
- Captures decisions at the moment they're made
- No extra effort required from developers
- Commit history becomes searchable context
- Team decisions are automatically documented

## Implementation Steps

- [ ] Create `memories hook install` command
- [ ] Create `memories hook uninstall` command
- [ ] Implement `commit-msg` hook script:
  ```bash
  #!/bin/bash
  # .git/hooks/commit-msg
  memories hook parse "$1"
  ```
- [ ] Create `memories hook parse <file>` command:
  - Parse commit message for tags
  - Extract content after tags
  - Create appropriate memory type
- [ ] Supported tags:
  - `[decision]` → decision type
  - `[fact]` → fact type
  - `[rule]` → rule type
  - `[note]` → note type
- [ ] Support multi-line extractions
- [ ] Add `--dry-run` to test without creating memories

## Example Commit Messages

```
feat(auth): implement JWT refresh tokens

[decision] Using refresh tokens with 7-day expiry for better UX.
Alternatives: session-based auth, shorter expiry with re-login.

[fact] Refresh tokens stored in httpOnly cookies for security.
```

This creates two memories:
1. Decision: "Using refresh tokens with 7-day expiry..."
2. Fact: "Refresh tokens stored in httpOnly cookies..."

## Acceptance Criteria

- [ ] `memories hook install` sets up git hook
- [ ] Commits with `[decision]` create decision memories
- [ ] Commits with `[fact]` create fact memories
- [ ] `memories hook uninstall` removes hook
- [ ] Works with existing git workflow (non-blocking)
