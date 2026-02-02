# Task: Add `memories prompt` Command

## Priority: Quick Win

## Description
Create a `memories prompt` command that outputs rules formatted for AI system prompts. This makes it trivial to inject project context into any AI tool.

## Why It Matters
- Users can copy-paste rules directly into ChatGPT, Claude, or any AI
- Enables integration with tools that don't support MCP
- Makes the value of memories immediately visible

## Implementation Steps

- [ ] Create `src/commands/prompt.ts`
- [ ] Output all rules in markdown format by default
- [ ] Support different output formats:
  - `--format markdown` (default): Bulleted list
  - `--format xml`: Wrapped in `<rules>` tags
  - `--format plain`: One rule per line
- [ ] Option to include decisions/facts: `--include decisions,facts`
- [ ] Option to output to clipboard: `--copy` (use `clipboardy` or similar)
- [ ] Add command to index.ts
- [ ] Add tests

## Example Output

```markdown
## Project Rules

- Always use TypeScript strict mode
- Handle all errors explicitly with try/catch
- Use Tailwind for styling

## Key Decisions

- Chose PostgreSQL for JSONB support
- Using FTS5 for full-text search
```

## Acceptance Criteria

- [ ] `memories prompt` outputs all rules in markdown
- [ ] `memories prompt --format xml` outputs XML format
- [ ] `memories prompt --copy` copies to clipboard
- [ ] `memories prompt --include decisions` includes decisions
- [ ] Works with both global and project-scoped rules
