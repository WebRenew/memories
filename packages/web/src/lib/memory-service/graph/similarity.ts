import {
  getSimilarityEdgeMaxK,
  getSimilarityEdgeMaxPerMemory,
  getSimilarityEdgeThreshold,
} from "@/lib/env"
import { buildNotExpiredFilter, buildUserScopeFilter } from "../scope"
import type { MemoryLayer, TursoClient } from "../types"
import type { GraphNodeRef } from "./extract"
import { replaceMemorySimilarityEdges, type GraphEdgeWrite } from "./upsert"

interface SimilarityCandidateRow {
  memory_id: string
  embedding: unknown
  updated_at: string
}

export interface ComputeSimilarityEdgesInput {
  turso: TursoClient
  memoryId: string
  embedding: number[]
  modelId: string
  projectId: string | null
  userId: string | null
  layer: MemoryLayer
  expiresAt: string | null
  nowIso?: string
  threshold?: number
  maxCandidates?: number
  maxEdges?: number
}

function decodeEmbeddingBlob(value: unknown): Float32Array | null {
  let bytes: Uint8Array | null = null
  if (value instanceof Uint8Array) {
    bytes = value
  } else if (value instanceof ArrayBuffer) {
    bytes = new Uint8Array(value)
  } else if (ArrayBuffer.isView(value)) {
    bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  } else if (Array.isArray(value)) {
    bytes = new Uint8Array(value.map((item) => Number(item) & 0xff))
  }

  if (!bytes || bytes.byteLength === 0 || bytes.byteLength % 4 !== 0) {
    return null
  }

  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  return new Float32Array(buffer)
}

function cosineSimilarity(sourceEmbedding: number[], candidateEmbedding: Float32Array): number {
  if (sourceEmbedding.length !== candidateEmbedding.length || sourceEmbedding.length === 0) {
    return -1
  }

  let dot = 0
  let sourceNorm = 0
  let candidateNorm = 0

  for (let index = 0; index < sourceEmbedding.length; index += 1) {
    const sourceValue = sourceEmbedding[index]
    const candidateValue = candidateEmbedding[index]
    dot += sourceValue * candidateValue
    sourceNorm += sourceValue * sourceValue
    candidateNorm += candidateValue * candidateValue
  }

  if (sourceNorm <= 0 || candidateNorm <= 0) {
    return -1
  }

  return dot / Math.sqrt(sourceNorm * candidateNorm)
}

function memoryNodeRef(memoryId: string): GraphNodeRef {
  return {
    nodeType: "memory",
    nodeKey: memoryId,
  }
}

function isMissingEmbeddingsTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : ""
  return message.includes("no such table") && message.includes("memory_embeddings")
}

export async function computeSimilarityEdges(input: ComputeSimilarityEdgesInput): Promise<GraphEdgeWrite[]> {
  if (input.embedding.length === 0) return []

  const nowIso = input.nowIso ?? new Date().toISOString()
  const threshold = Math.max(0, Math.min(1, input.threshold ?? getSimilarityEdgeThreshold()))
  const maxCandidates = Math.max(1, input.maxCandidates ?? getSimilarityEdgeMaxK())
  const maxEdges = Math.max(1, input.maxEdges ?? getSimilarityEdgeMaxPerMemory())
  const userFilter = buildUserScopeFilter(input.userId, "m.")
  const activeFilter = buildNotExpiredFilter(nowIso, "m.")
  const projectFilter = input.projectId
    ? "AND (m.scope = 'global' OR (m.scope = 'project' AND m.project_id = ?))"
    : "AND m.scope = 'global'"

  const args: (string | number)[] = [input.modelId, input.memoryId]
  if (input.projectId) {
    args.push(input.projectId)
  }
  args.push(...userFilter.args)
  args.push(...activeFilter.args)
  args.push(maxCandidates)

  let resultRows: SimilarityCandidateRow[] = []
  try {
    const result = await input.turso.execute({
      sql: `SELECT m.id AS memory_id, e.embedding, m.updated_at
            FROM memory_embeddings e
            JOIN memories m ON m.id = e.memory_id
            WHERE e.model = ?
              AND m.id != ?
              AND m.deleted_at IS NULL
              ${projectFilter}
              AND ${userFilter.clause}
              AND ${activeFilter.clause}
            ORDER BY m.updated_at DESC
            LIMIT ?`,
      args,
    })
    resultRows = result.rows as unknown as SimilarityCandidateRow[]
  } catch (error) {
    if (isMissingEmbeddingsTableError(error)) {
      return []
    }
    throw error
  }

  const ranked = resultRows
    .map((row) => {
      const decoded = decodeEmbeddingBlob(row.embedding)
      if (!decoded) return null
      const score = cosineSimilarity(input.embedding, decoded)
      if (!Number.isFinite(score) || score < threshold) return null
      return {
        memoryId: row.memory_id,
        score,
        updatedAt: row.updated_at,
      }
    })
    .filter((entry): entry is { memoryId: string; score: number; updatedAt: string } => Boolean(entry))
    .sort((a, b) => b.score - a.score || String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, maxEdges)

  const expiresAt = input.layer === "working" ? input.expiresAt : null
  const edges: GraphEdgeWrite[] = []

  for (const match of ranked) {
    edges.push({
      from: memoryNodeRef(input.memoryId),
      to: memoryNodeRef(match.memoryId),
      edgeType: "similar_to",
      weight: match.score,
      confidence: 1,
      evidenceMemoryId: input.memoryId,
      expiresAt,
    })
    edges.push({
      from: memoryNodeRef(match.memoryId),
      to: memoryNodeRef(input.memoryId),
      edgeType: "similar_to",
      weight: match.score,
      confidence: 1,
      evidenceMemoryId: input.memoryId,
      expiresAt,
    })
  }

  return edges
}

export async function syncSimilarityEdgesForMemory(input: ComputeSimilarityEdgesInput): Promise<void> {
  const edges = await computeSimilarityEdges(input)
  await replaceMemorySimilarityEdges(input.turso, input.memoryId, edges, { nowIso: input.nowIso })
}
