# Task: Add Semantic Search with Local Embeddings

## Priority: Agent Improvement (Bigger Lift)

## Description
Implement semantic search using local embeddings so queries like "auth issues" can find "JWT token validation errors". Use `transformers.js` or similar for fully local, privacy-preserving embeddings.

## Why It Matters
- Current FTS5 search only matches keywords
- Semantic search understands meaning and intent
- Critical for AI agents to find relevant context
- No API calls = fast, private, works offline

## Implementation Steps

- [ ] Research embedding options:
  - `@xenova/transformers` (transformers.js)
  - `onnxruntime-node` with small model
  - Pre-computed embeddings with simple model
- [ ] Choose a small, fast model (e.g., `all-MiniLM-L6-v2`)
- [ ] Create `src/lib/embeddings.ts`
- [ ] Update database schema:
  - Add `embedding BLOB` column to memories table
  - Create embeddings table for caching
- [ ] Generate embeddings on `memories add`
- [ ] Implement cosine similarity search
- [ ] Update `searchMemories()` to use semantic search
- [ ] Add `--semantic` flag to search command
- [ ] Fall back to FTS5 if embeddings unavailable
- [ ] Add migration to backfill existing memories

## Technical Considerations

```typescript
// Embedding generation
import { pipeline } from '@xenova/transformers';

const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

async function getEmbedding(text: string): Promise<Float32Array> {
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return output.data;
}

// Cosine similarity search in SQLite
// Store as BLOB, use custom function for similarity
```

## Performance Targets

- Embedding generation: < 100ms per memory
- Search latency: < 200ms for 1000 memories
- Model size: < 50MB

## Acceptance Criteria

- [ ] `memories search --semantic "auth problems"` finds JWT-related memories
- [ ] Embeddings generated automatically on add
- [ ] Works fully offline (no API calls)
- [ ] Graceful fallback if model not available
- [ ] Migration backfills existing memories
