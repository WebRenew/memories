# RFC: Hosted SDK Embeddings and Semantic Retrieval

- Status: Draft
- Authors: memories team
- Created: 2026-02-19
- Target release: phased rollout after canary validation

## Summary

The hosted SDK path currently stores and retrieves memories without generating embeddings. Retrieval is keyword-based (FTS + BM25) with optional graph expansion. We need hosted embedding generation and semantic retrieval so SDK users get parity with local CLI semantic capabilities.

This RFC proposes:

1. Embedding generation on hosted memory writes.
2. Backfill for existing memories without embeddings.
3. Semantic and hybrid retrieval modes in SDK APIs.
4. Tenant/user safe isolation, observability, and staged rollout.

## Problem

Current state:

- Hosted writes (`/api/sdk/v1/memories/add`) persist memory rows but do not create embeddings.
- Hosted search/context retrieval uses FTS/BM25 and LIKE fallback.
- Local CLI already supports embedding generation and semantic search.

Impact:

- SDK users cannot opt into vector similarity retrieval.
- Relevance quality for semantic/intent queries is lower than local CLI.
- Product story is inconsistent across local and hosted offerings.

## Goals

1. Add hosted embedding creation for new/edited memories.
2. Expose semantic retrieval in SDK search/context APIs.
3. Preserve existing behavior as safe fallback.
4. Keep strict tenant/user/project isolation guarantees.
5. Provide rollout controls with measurable quality/cost impact.

## Non-goals

1. Cross-tenant retrieval.
2. User-selectable embedding provider marketplace in v1.
3. Removing FTS/BM25 baseline retrieval.

## Proposed Design

### 1) Data model and storage

Add hosted embedding storage for each memory record:

- `memory_embeddings` table keyed by `memory_id`
- fields: `memory_id`, `embedding` (vector/binary), `model`, `dimension`, `created_at`, `updated_at`
- indexes for scoped retrieval joins and maintenance tasks

Design constraints:

- embeddings never override tenancy boundaries
- embeddings are deleted/updated when source memory is deleted/edited
- dimension/model metadata is explicit for migration safety

### 2) Write path

On `memories.add` and `memories.edit(content)`:

1. Persist memory row first.
2. Queue embedding generation job (async, non-blocking for request path).
3. Upsert embedding row on success.
4. Emit structured metrics/logs for success/failure/latency.

Behavior on failure:

- memory write still succeeds
- embedding generation retries with backoff
- retrieval falls back to lexical ranking when embeddings unavailable

### 3) Retrieval API changes

Add retrieval mode controls to hosted SDK endpoints:

- `search`: `strategy: "lexical" | "semantic" | "hybrid"` (default `"lexical"` initially)
- `context/get`: same strategy control, with weighted fusion for hybrid

Initial ranking behavior:

- lexical: existing BM25 behavior
- semantic: cosine similarity over scoped candidate set
- hybrid: weighted rank fusion (BM25 + vector score), then existing layer ordering rules

Compatibility:

- existing clients without strategy fields keep current behavior
- no breaking API contract changes

### 4) Backfill

Introduce backfill worker for existing memories:

- scoped by tenant/user/project windows
- idempotent batches with checkpointing
- throttled to protect p95 API latency
- resumable after interruption

### 5) Model and configuration

v1 defaults:

- one hosted embedding model per environment (configurable by ops)
- dimension validated at write and query time
- model version stamped in embedding row

Future:

- per-tenant model override can be layered later if needed

## Security and isolation

Requirements:

1. Vector queries must apply scope filters before ranking.
2. Tenant/user/project filters must be identical to lexical path.
3. No embedding payload or raw vectors in user-facing logs.
4. Encryption and key handling follow existing database policy.

## Observability

Track:

- write-path embedding queue latency/failure rate
- backfill progress and retry counts
- retrieval p50/p95 by strategy
- semantic/hybrid fallback rate to lexical
- cost metrics per memory written and per query

Add runbooks for:

- embedding job backlog growth
- model mismatch/dimension errors
- elevated retrieval latency

## Rollout plan

1. Shadow mode:
   - generate embeddings and compute semantic scores off-path
   - compare with lexical outcomes, no user-facing changes
2. Canary:
   - enable semantic/hybrid for small tenant subset
   - monitor relevance, latency, and costs
3. Gradual expansion:
   - increase coverage with SLO gates
4. GA:
   - documented public strategy options in SDK docs

Rollback:

- force `strategy=lexical` globally via feature flag
- pause backfill/embedding workers
- keep memory writes available

## Migration and docs

Deliverables:

1. SDK docs for new strategy options and defaults.
2. Operational docs for backfill and incident response.
3. Changelog + migration notes (including fallback behavior).

## Open questions

1. Which hosted vector representation is preferred in Turso/libSQL for v1?
2. Should hybrid strategy default become `"hybrid"` after GA?
3. Do we expose per-request thresholds/weights in v1 or keep server-tuned defaults?

## References

- Hosted context retrieval: `packages/web/src/lib/memory-service/queries.ts`
- Hosted mutations: `packages/web/src/lib/memory-service/mutations.ts`
- CLI embedding generation: `packages/cli/src/lib/memory.ts`
- CLI embedding utilities: `packages/cli/src/lib/embeddings.ts`
