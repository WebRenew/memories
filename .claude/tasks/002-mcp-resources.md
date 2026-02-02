# Task: Add MCP Resources

## Priority: Quick Win

## Description
Expose memories as MCP resources, not just tools. This allows AI agents to browse available context without calling tools, and enables better context management.

## Why It Matters
- Agents can "see" what context is available before requesting it
- Resources are cached and more efficient than repeated tool calls
- Better integration with MCP-native workflows

## Implementation Steps

- [ ] Update `src/mcp/index.ts` to register resources
- [ ] Add `memories://rules` resource - all active rules
- [ ] Add `memories://recent` resource - recent memories (last 20)
- [ ] Add `memories://project/{id}` resource template - project-specific memories
- [ ] Resources should update when memories change
- [ ] Add proper MIME types (text/markdown)

## Example Resources

```
memories://rules
  → Returns all rules as markdown

memories://recent
  → Returns 20 most recent memories

memories://project/github.com/user/repo
  → Returns all memories for specific project
```

## MCP Resource Registration

```typescript
server.resource(
  "memories://rules",
  "Active rules for the current project",
  "text/markdown",
  async () => {
    const rules = await getRules();
    return formatRulesAsMarkdown(rules);
  }
);
```

## Acceptance Criteria

- [ ] `memories://rules` resource returns all rules
- [ ] `memories://recent` resource returns recent memories
- [ ] Resources work in Claude Code / Cursor MCP integration
- [ ] Resources update when memories change
