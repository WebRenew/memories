# Task: Shell Watch Mode for Pattern Detection

## Priority: Integration

## Description
Create `memories watch` command that monitors shell history and suggests memories based on repeated patterns or commands.

## Why It Matters
- Users often repeat complex commands they should remember
- Catches knowledge that would otherwise be lost
- Proactive memory suggestions
- Learns from actual workflow

## Implementation Steps

- [ ] Create `src/commands/watch.ts`
- [ ] Monitor shell history file (`.bash_history`, `.zsh_history`)
- [ ] Detect patterns:
  - Commands run 3+ times in a session
  - Complex commands with many flags
  - Commands that follow error patterns
- [ ] Suggest memories interactively:
  ```
  ⚡ Detected repeated command:
     docker compose -f docker-compose.dev.yml up --build
     
     Would you like to save this as a memory? [y/N]
  ```
- [ ] Support different shells (bash, zsh, fish)
- [ ] Option to run in background: `memories watch --daemon`
- [ ] Configurable sensitivity (how many repeats trigger suggestion)

## Technical Approach

```typescript
// Watch history file for changes
import { watch } from 'chokidar';

const historyPath = getHistoryPath(); // ~/.zsh_history or similar
const watcher = watch(historyPath);

watcher.on('change', async () => {
  const newCommands = await getNewCommands();
  const patterns = detectPatterns(newCommands);
  
  for (const pattern of patterns) {
    await suggestMemory(pattern);
  }
});
```

## Configuration

```yaml
# ~/.config/memories/watch.yaml
enabled: true
shell: zsh
min_repeats: 3
ignore_patterns:
  - "^cd "
  - "^ls"
  - "^git status"
```

## Acceptance Criteria

- [ ] `memories watch` starts interactive monitor
- [ ] Detects repeated commands and suggests memories
- [ ] User can accept/reject suggestions
- [ ] Works with zsh and bash
- [ ] `memories watch --daemon` runs in background
