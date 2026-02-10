# SDK Build Plan: `@memories.sh/core` + `@memories.sh/ai-sdk`

Last updated: 2026-02-10

## Objective

Ship production-ready SDK packages that match what we market and document:

- `@memories.sh/core`: typed client for context + memory operations
- `@memories.sh/ai-sdk`: [Vercel AI SDK](https://ai-sdk.dev/) middleware/tools integration

## Current Gap (Why This Plan Exists)

- Website/docs currently describe both SDK packages in detail.
- Monorepo currently contains only:
  - `@memories.sh/cli`
  - `@memories.sh/web`
- Result: product/docs promise exceeds shipped reality.

## Success Criteria

1. Both packages exist in monorepo with tests and examples.
2. Public APIs match docs (or docs are adjusted to exactly match shipped APIs).
3. CI validates package build, typecheck, lint, and tests.
4. Publish flow exists for both packages with semver + changelog.
5. Minimal production integrations are validated end-to-end.

## Scope

### In Scope

- New package scaffolding (`packages/core`, `packages/ai-sdk`)
- SDK API design + implementation
- Structured backend contract needed by SDK
- Unit/integration tests
- Docs + examples + snippet correctness
- NPM publishing pipeline and release process

### Out of Scope (for first stable release)

- Non-TypeScript SDKs
- Complex analytics dashboards for SDK usage
- Backward compatibility guarantees with pre-release APIs

## Workstreams

## WS0: Contract Alignment (Stop Drift First)

Goal: ensure marketing/docs and actual deliverable are aligned during build.

Tasks:

- Mark SDK docs as `beta` while build is in progress.
- Add a single source-of-truth status section to docs home.
- Define exact v1 API surface for both packages.

Acceptance:

- No public doc claims APIs that do not exist in code.

## WS1: Backend API Contract for SDK (Structured JSON)

Goal: provide SDK-consumable JSON responses (not only formatted text).

Current risk:

- Existing MCP tool responses are human-formatted text blocks; SDK needs typed data.

Tasks:

- Introduce structured endpoints (or structured MCP mode) for:
  - `context.get`
  - `memories.add/search/list/edit/forget`
- Define stable DTOs for:
  - `Memory`
  - `ContextResponse`
  - `SearchResponse`
  - typed errors
- Add API versioning strategy (header or route prefix).

Acceptance:

- SDK methods can operate without parsing human-formatted strings.
- Endpoint behavior has integration tests and fixtures.

## WS2: `@memories.sh/core` Package

Goal: standalone typed client usable in any stack/runtime.

Proposed v1 API:

- `new MemoriesClient(options)`
- `client.context.get(query?, options?)`
- `client.memories.add(input)`
- `client.memories.search(query, options?)`
- `client.memories.list(options?)`
- `client.memories.edit(id, updates)`
- `client.memories.forget(id)`
- `client.buildSystemPrompt(context)`

Tasks:

- Scaffold package (`tsconfig`, build config, exports, types).
- Implement HTTP transport with:
  - auth header injection
  - timeout and retry policy
  - typed error mapping
- Add input/output validation with zod.
- Add runtime compatibility tests (Node + Edge-safe fetch path).

Acceptance:

- Package builds and tree-shakes.
- API methods are fully typed and covered by tests.
- Works with `MEMORIES_API_KEY` env default + explicit key override.

## WS3: `@memories.sh/ai-sdk` Package

Goal: first-class integration for [Vercel AI SDK](https://ai-sdk.dev/).

Proposed v1 API:

- `memoriesMiddleware(options?)`
- `memoriesTools(options?)`
- Individual tools:
  - `getContext`, `storeMemory`, `searchMemories`, `forgetMemory`, `listMemories`
- `memoriesSystemPrompt(options?)`
- `createMemoriesOnFinish(options?)`
- `preloadContext(options?)`

Tasks:

- Choose supported AI SDK version range and set peer deps.
- Implement middleware transform flow with robust query extraction.
- Implement tool wrappers with typed schemas + error handling.
- Ensure composability with other middleware.
- Add tests for:
  - middleware injection behavior
  - tool call behavior
  - multi-turn + stop conditions

Acceptance:

- Example app can switch between middleware-only and tools-mode.
- API shape is stable and matches docs.

## WS4: DX, Examples, and Docs Truthfulness

Goal: no doc drift; every snippet is runnable.

Tasks:

- Add examples:
  - AI SDK middleware usage
  - AI SDK tools usage
  - core client with Anthropic/OpenAI-style usage
- Add snippet tests (compile or run smoke checks).
- Update docs pages under `/content/docs/sdk/*` to exact shipped API.
- Add migration notes for any renames/options changes.

Acceptance:

- CI fails if docs snippets drift from package APIs.

## WS5: Release Engineering

Goal: safe, repeatable package publishing.

Tasks:

- Add changesets (or equivalent) for versioning/changelog.
- Add publish workflow for scoped packages.
- Add provenance + npm token requirements.
- Add release checklist:
  - verify package contents
  - verify install command
  - verify docs links

Acceptance:

- Dry-run release works from CI.
- First public release can be executed with one documented command path.

## WS6: Adoption + Hardening Pass

Goal: validate behavior in real integrations and close reliability gaps.

Tasks:

- Use SDK internally in web app integration path (dogfooding slice).
- Add error telemetry hooks.
- Add rate limit/backoff guidance in docs.
- Validate behavior with expired/revoked API keys and partial outages.

Acceptance:

- At least one production path uses the SDK package, not ad hoc calls.

## Delivery Phases

## Phase A (Days 1-2): Foundation

- WS0 complete
- package scaffolds created
- initial API contracts drafted

## Phase B (Days 3-5): Functional SDK

- WS1 + WS2 + WS3 implemented with baseline tests
- private/internal beta usable

## Phase C (Days 6-7): Release Readiness

- WS4 + WS5 complete
- docs/snippets in sync
- publish dry-run complete

## Phase D (Post-release): Hardening

- WS6
- backlog triage from early adopters

## Risks and Mitigations

1. Risk: backend returns human text instead of structured data.
   Mitigation: finish WS1 before locking SDK method signatures.
2. Risk: docs drift during implementation.
   Mitigation: beta status banner + snippet CI.
3. Risk: SDK surface grows too wide pre-release.
   Mitigation: freeze v1 API and move extras to v1.1 backlog.
4. Risk: AI SDK version churn.
   Mitigation: explicit peer dependency range + compatibility matrix.

## Definition of Done (v1 GA)

- Packages published:
  - `@memories.sh/core`
  - `@memories.sh/ai-sdk`
- Semver tags and changelog entries available.
- Docs and examples verified in CI.
- End-to-end tests green in monorepo CI.
- Support policy documented (runtime + version compatibility).

## Immediate Next Actions (Execution Order)

1. Create package scaffolds for `core` and `ai-sdk`.
2. Implement structured SDK backend contract.
3. Implement `core` client methods with tests.
4. Implement `ai-sdk` middleware/tools with tests.
5. Wire examples + snippet checks.
6. Add release workflow and perform first publish dry-run.
