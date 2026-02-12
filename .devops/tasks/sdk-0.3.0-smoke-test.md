# Task: SDK 0.3.0 Publish Smoke Test

## Goal
Validate that `@memories.sh/core@0.3.0` and `@memories.sh/ai-sdk@0.3.0` install cleanly and expose the new management APIs in a fresh project.

## Owner
Engineering

## Priority
High

## Definition of Done
- Fresh install succeeds with pinned `0.3.0` versions.
- Typecheck confirms new APIs are present.
- Runtime smoke script executes and calls read-only management endpoints.
- Results are posted in team channel (or PR comment) with pass/fail and logs.

## Scope
- Include:
- `@memories.sh/core` `client.management.keys.get()`
- `@memories.sh/core` `client.management.tenants.list()`
- `@memories.sh/ai-sdk` `memoriesManagement().keys.get()`
- `@memories.sh/ai-sdk` `memoriesManagement().tenants.list()`
- Exclude:
- write/mutating operations (`create`, `upsert`, `disable`, `revoke`) in smoke run

## Prerequisites
- Node.js `>=20`
- `pnpm`
- Valid `MEMORIES_API_KEY` for live call phase

## Steps

### 1) Create clean workspace
```bash
mkdir -p /tmp/memories-sdk-smoke && cd /tmp/memories-sdk-smoke
pnpm init
pnpm add @memories.sh/core@0.3.0 @memories.sh/ai-sdk@0.3.0
pnpm add -D typescript tsx @types/node
```

### 2) Add `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"]
  }
}
```

### 3) Add `smoke.ts`
```ts
import { MemoriesClient } from "@memories.sh/core";
import { memoriesManagement } from "@memories.sh/ai-sdk";

async function main() {
  const apiKey = process.env.MEMORIES_API_KEY;
  if (!apiKey) {
    throw new Error("MEMORIES_API_KEY is required for live smoke test");
  }

  const client = new MemoriesClient({
    apiKey,
    baseUrl: "https://memories.sh",
    transport: "sdk_http",
  });

  const keyStatusCore = await client.management.keys.get();
  const tenantsCore = await client.management.tenants.list();

  const mgmt = memoriesManagement({
    apiKey,
    baseUrl: "https://memories.sh",
  });

  const keyStatusAiSdk = await mgmt.keys.get();
  const tenantsAiSdk = await mgmt.tenants.list();

  console.log("core.keys.get.hasKey:", keyStatusCore.hasKey);
  console.log("core.tenants.list.count:", tenantsCore.count);
  console.log("ai.keys.get.hasKey:", keyStatusAiSdk.hasKey);
  console.log("ai.tenants.list.count:", tenantsAiSdk.count);
  console.log("SMOKE_TEST_PASS");
}

main().catch((err) => {
  console.error("SMOKE_TEST_FAIL");
  console.error(err);
  process.exit(1);
});
```

### 4) Run checks
```bash
pnpm exec tsc --noEmit smoke.ts
MEMORIES_API_KEY=YOUR_KEY pnpm exec tsx smoke.ts
```

## Expected Output
- `tsc --noEmit` passes with no type errors.
- Runtime prints four values and ends with `SMOKE_TEST_PASS`.
- Exit code `0`.

## Failure Handling
- If install fails: capture `pnpm` output and Node/pnpm versions.
- If typecheck fails: capture exact missing symbol/type error.
- If runtime fails: capture HTTP status/message and endpoint path.

## Reporting Template
- Environment: Node version, pnpm version
- Installed versions: core + ai-sdk
- Typecheck: PASS/FAIL
- Runtime: PASS/FAIL
- Logs: attached
