import {
  type GraphExplainability,
  MEMORY_COLUMNS,
  MEMORY_COLUMNS_ALIASED,
  type MemoryLayer,
  type MemoryRow,
  type ContextRetrievalStrategy,
  type TursoClient,
  VALID_TYPES,
} from "./types"
import {
  buildLayerFilterClause,
  buildNotExpiredFilter,
  buildUserScopeFilter,
} from "./scope"

export function dedupeMemories(rows: MemoryRow[]): MemoryRow[] {
  const seen = new Set<string>()
  const deduped: MemoryRow[] = []
  for (const row of rows) {
    const key = row.id || `${row.type}:${row.scope}:${row.content}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(row)
  }
  return deduped
}

export function resolveMemoryLayer(row: MemoryRow): MemoryLayer {
  if (row.memory_layer === "rule" || row.memory_layer === "working" || row.memory_layer === "long_term") {
    return row.memory_layer
  }
  return row.type === "rule" ? "rule" : "long_term"
}

export function normalizeRetrievalStrategy(value: ContextRetrievalStrategy | undefined): ContextRetrievalStrategy {
  return value === "hybrid_graph" ? "hybrid_graph" : "baseline"
}

export function normalizeGraphDepth(value: number | undefined): 0 | 1 | 2 {
  if (value === 0 || value === 1 || value === 2) {
    return value
  }
  return 1
}

export function normalizeGraphLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return 8
  return Math.max(1, Math.min(Math.floor(value ?? 8), 50))
}

export function graphReasonRank(reason: GraphExplainability | undefined): number {
  if (!reason) return 0
  const sharedNodeBoost = reason.edgeType === "shared_node" ? 0.25 : 0
  return sharedNodeBoost + 1 / Math.max(1, reason.hopCount)
}

export async function listScopedMemoriesByIds(
  turso: TursoClient,
  memoryIds: string[],
  projectId: string | undefined,
  userId: string | null,
  nowIso: string,
  limit: number
): Promise<MemoryRow[]> {
  const uniqueIds = Array.from(new Set(memoryIds.filter(Boolean)))
  if (uniqueIds.length === 0 || limit <= 0) {
    return []
  }

  const userFilter = buildUserScopeFilter(userId)
  const activeFilter = buildNotExpiredFilter(nowIso)
  const idPlaceholders = uniqueIds.map(() => "?").join(", ")
  let sql = `SELECT ${MEMORY_COLUMNS} FROM memories
             WHERE id IN (${idPlaceholders})
               AND deleted_at IS NULL
               AND type != 'rule'
               AND (memory_layer = 'working' OR memory_layer IS NULL OR memory_layer = 'long_term')
               AND ${userFilter.clause}
               AND ${activeFilter.clause}
               AND (scope = 'global'`
  const args: (string | number)[] = [...uniqueIds, ...userFilter.args, ...activeFilter.args]

  if (projectId) {
    sql += " OR (scope = 'project' AND project_id = ?)"
    args.push(projectId)
  }
  sql += ") ORDER BY updated_at DESC LIMIT ?"
  args.push(limit)

  const result = await turso.execute({ sql, args })
  return result.rows as unknown as MemoryRow[]
}

export async function searchWithFts(
  turso: TursoClient,
  query: string,
  projectId: string | undefined,
  userId: string | null,
  nowIso: string,
  limit: number,
  options?: { excludeType?: string; includeType?: string; includeLayer?: MemoryLayer }
): Promise<MemoryRow[]> {
  const { excludeType, includeType, includeLayer } = options ?? {}
  const userFilter = buildUserScopeFilter(userId, "m.")
  const layerFilter = buildLayerFilterClause(includeLayer ?? null, "m.")
  const activeFilter = buildNotExpiredFilter(nowIso, "m.")

  try {
    let typeFilter = ""
    const ftsArgs: (string | number)[] = [query]

    if (excludeType && VALID_TYPES.has(excludeType)) {
      typeFilter = "AND m.type != ?"
      ftsArgs.push(excludeType)
    } else if (includeType && VALID_TYPES.has(includeType)) {
      typeFilter = "AND m.type = ?"
      ftsArgs.push(includeType)
    }

    const projectFilter = projectId
      ? `AND (m.scope = 'global' OR (m.scope = 'project' AND m.project_id = ?))`
      : `AND m.scope = 'global'`
    if (projectId) ftsArgs.push(projectId)
    ftsArgs.push(...userFilter.args)
    ftsArgs.push(...activeFilter.args)
    ftsArgs.push(limit)

    const ftsResult = await turso.execute({
      sql: `SELECT ${MEMORY_COLUMNS_ALIASED}
            FROM memories_fts fts
            JOIN memories m ON m.rowid = fts.rowid
            WHERE memories_fts MATCH ? AND m.deleted_at IS NULL
            ${typeFilter} ${projectFilter} AND ${userFilter.clause} AND ${layerFilter.clause} AND ${activeFilter.clause}
            ORDER BY bm25(memories_fts) LIMIT ?`,
      args: ftsArgs,
    })

    if (ftsResult.rows.length > 0) {
      return ftsResult.rows as unknown as MemoryRow[]
    }
  } catch {
    // FTS table may not exist for older DBs — fall through to LIKE.
  }

  let sql = `SELECT ${MEMORY_COLUMNS} FROM memories
             WHERE deleted_at IS NULL AND content LIKE ?`
  const sqlArgs: (string | number)[] = [`%${query}%`]

  if (excludeType && VALID_TYPES.has(excludeType)) {
    sql += " AND type != ?"
    sqlArgs.push(excludeType)
  } else if (includeType && VALID_TYPES.has(includeType)) {
    sql += " AND type = ?"
    sqlArgs.push(includeType)
  }

  const fallbackUserFilter = buildUserScopeFilter(userId)
  sql += ` AND ${fallbackUserFilter.clause}`
  sqlArgs.push(...fallbackUserFilter.args)
  const fallbackLayerFilter = buildLayerFilterClause(includeLayer ?? null)
  sql += ` AND ${fallbackLayerFilter.clause}`
  const fallbackActiveFilter = buildNotExpiredFilter(nowIso)
  sql += ` AND ${fallbackActiveFilter.clause}`
  sqlArgs.push(...fallbackActiveFilter.args)

  sql += " AND (scope = 'global'"
  if (projectId) {
    sql += " OR (scope = 'project' AND project_id = ?)"
    sqlArgs.push(projectId)
  }
  sql += ") ORDER BY created_at DESC LIMIT ?"
  sqlArgs.push(limit)

  const result = await turso.execute({ sql, args: sqlArgs })
  return result.rows as unknown as MemoryRow[]
}

export async function listRecentMemoriesByLayer(
  turso: TursoClient,
  projectId: string | undefined,
  userId: string | null,
  layer: MemoryLayer,
  nowIso: string,
  limit: number,
  options?: { excludeType?: string }
): Promise<MemoryRow[]> {
  const userFilter = buildUserScopeFilter(userId)
  const layerFilter = buildLayerFilterClause(layer)
  const activeFilter = buildNotExpiredFilter(nowIso)
  let sql = `SELECT ${MEMORY_COLUMNS} FROM memories
             WHERE deleted_at IS NULL
             AND ${userFilter.clause}
             AND ${layerFilter.clause}
             AND ${activeFilter.clause}
             AND (scope = 'global'`
  const args: (string | number)[] = [...userFilter.args, ...activeFilter.args]

  if (projectId) {
    sql += " OR (scope = 'project' AND project_id = ?)"
    args.push(projectId)
  }
  sql += ")"

  if (options?.excludeType && VALID_TYPES.has(options.excludeType)) {
    sql += " AND type != ?"
    args.push(options.excludeType)
  }

  sql += " ORDER BY updated_at DESC LIMIT ?"
  args.push(limit)

  const result = await turso.execute({ sql, args })
  return result.rows as unknown as MemoryRow[]
}
