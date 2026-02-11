# @memories.sh/core

## 0.3.0

### Minor Changes

- 16e68df: Add first-class SDK management APIs for keys and tenant mappings.

  - `@memories.sh/core`
    - Add typed `client.management.keys` methods: `get`, `create`, `revoke`
    - Add typed `client.management.tenants` methods: `list`, `upsert`, `disable`
    - Add exported management input/output types
  - `@memories.sh/ai-sdk`
    - Add `memoriesManagement()` helper plus `managementKeys()` and `managementTenants()`
    - Expose typed management interfaces for AI SDK users

  This release removes the need for direct raw HTTP calls for management operations when using the SDK packages.

## 0.2.0

### Minor Changes

- fa54f10: Add tenant-scoped SDK support for hosted MCP routing.

  - `@memories.sh/core`
    - Add `tenantId` option on `MemoriesClient` and include `tenant_id` in tool calls.
    - Keep `userId` support for per-user scope within a tenant.
    - Improve typed error handling and stable response envelope handling.
  - `@memories.sh/ai-sdk`
    - Require `tenantId` when constructing internal clients (unless a preconfigured `client` is passed).
    - Pass tenant/user scope through middleware and tools wrappers.
  - Docs
    - Add package READMEs for `@memories.sh/core` and `@memories.sh/ai-sdk`.
