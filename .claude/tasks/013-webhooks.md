# Task: Add Webhook Support

## Priority: Integration

## Description
Add webhook notifications when memories change. This enables integration with external systems, team notifications, and automation workflows.

## Why It Matters
- Teams can be notified when rules change
- Integration with Slack, Discord, or custom systems
- Enables automation workflows (e.g., CI updates)
- Audit trail for memory changes

## Implementation Steps

- [ ] Create `src/lib/webhooks.ts`
- [ ] Store webhook configuration in database:
  ```sql
  CREATE TABLE webhooks (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    events TEXT NOT NULL, -- comma-separated: add,update,delete
    secret TEXT, -- for signature verification
    active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  ```
- [ ] Create webhook commands:
  - `memories webhook add <url> --events add,delete`
  - `memories webhook list`
  - `memories webhook remove <id>`
  - `memories webhook test <id>`
- [ ] Trigger webhooks on memory operations
- [ ] Implement retry logic (3 attempts with backoff)
- [ ] Sign payloads with HMAC-SHA256

## Webhook Payload

```json
{
  "event": "memory.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "memory": {
    "id": "abc123",
    "content": "Always use TypeScript strict mode",
    "type": "rule",
    "scope": "project",
    "project_id": "github.com/user/repo"
  },
  "signature": "sha256=..."
}
```

## Events

- `memory.created` - New memory added
- `memory.updated` - Memory content/tags changed
- `memory.deleted` - Memory soft-deleted
- `rule.created` - Specifically for new rules (subset of created)

## Acceptance Criteria

- [ ] `memories webhook add` registers webhook
- [ ] Webhooks fire on memory changes
- [ ] Payloads are signed for verification
- [ ] Retry logic handles failures
- [ ] `memories webhook test` sends test payload
