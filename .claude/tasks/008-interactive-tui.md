# Task: Build Interactive TUI

## Priority: User Improvement (Bigger Lift)

## Description
Create an interactive terminal UI for browsing, searching, and managing memories. Think `lazygit` or `k9s` but for memories.

## Why It Matters
- Visual exploration is faster than CLI commands
- Edit/delete without remembering IDs
- Better for users who prefer visual interfaces
- Makes the tool more approachable

## Implementation Steps

- [ ] Choose TUI framework:
  - `ink` (React for CLI) - familiar patterns
  - `blessed` / `blessed-contrib` - more control
  - `terminal-kit` - simpler API
- [ ] Create `src/commands/ui.ts` or `src/tui/index.ts`
- [ ] Implement views:
  - **List view**: Browse memories with vim-like navigation
  - **Search view**: Real-time search as you type
  - **Detail view**: Full memory with metadata
  - **Edit view**: Modify memory content/tags
- [ ] Keyboard shortcuts:
  - `j/k` or arrows: Navigate
  - `/`: Search
  - `e`: Edit selected
  - `d`: Delete selected
  - `a`: Add new memory
  - `t`: Filter by type
  - `q`: Quit
- [ ] Color coding by memory type
- [ ] Status bar with stats

## Example Layout

```
┌─ memories.sh ──────────────────────────────────────────┐
│ [Rules] [Decisions] [Facts] [Notes] [All]              │
├────────────────────────────────────────────────────────┤
│ 📌 Always use TypeScript strict mode          G  3d ago│
│ 📌 Handle errors with try/catch               P  5d ago│
│ 💡 Chose PostgreSQL for JSONB support         P  1w ago│
│ 📋 API rate limit is 100/min                  P  2w ago│
│ 📝 Need to refactor auth module               P  1d ago│
│ > 📝 Updated deployment process               G  today │
├────────────────────────────────────────────────────────┤
│ [/] Search  [a] Add  [e] Edit  [d] Delete  [q] Quit   │
└────────────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] `memories ui` launches interactive TUI
- [ ] Can browse, search, filter memories
- [ ] Can edit and delete memories
- [ ] Can add new memories
- [ ] Keyboard navigation works smoothly
- [ ] Responsive to terminal size
