import { buildUserScopeFilter } from "./scope"
import { apiError, type TursoClient, ToolExecutionError } from "./types"

type SkillFileScope = "global" | "project"

interface SkillFileRow {
  id: string
  path: string
  content: string
  scope: SkillFileScope
  project_id: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

function normalizeScope(projectId?: string | null): SkillFileScope {
  return projectId ? "project" : "global"
}

function exactUserScopeFilter(userId: string | null): { clause: string; args: string[] } {
  if (userId) {
    return { clause: "user_id = ?", args: [userId] }
  }
  return { clause: "user_id IS NULL", args: [] }
}

function toStructuredSkillFile(row: SkillFileRow) {
  return {
    id: row.id,
    path: row.path,
    content: row.content,
    scope: row.scope,
    projectId: row.project_id,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function upsertSkillFilePayload(params: {
  turso: TursoClient
  path: string
  content: string
  projectId?: string | null
  userId: string | null
  nowIso: string
}): Promise<{
  text: string
  data: {
    skillFile: ReturnType<typeof toStructuredSkillFile>
    created: boolean
    message: string
  }
}> {
  const { turso, path, content, projectId, userId, nowIso } = params
  const normalizedPath = path.trim()
  const normalizedContent = content.trim()

  if (!normalizedPath) {
    throw new ToolExecutionError(
      apiError({
        type: "validation_error",
        code: "SKILL_FILE_PATH_REQUIRED",
        message: "skill file path is required",
        status: 400,
        retryable: false,
        details: { field: "path" },
      }),
      { rpcCode: -32602 }
    )
  }

  if (!normalizedContent) {
    throw new ToolExecutionError(
      apiError({
        type: "validation_error",
        code: "SKILL_FILE_CONTENT_REQUIRED",
        message: "skill file content is required",
        status: 400,
        retryable: false,
        details: { field: "content" },
      }),
      { rpcCode: -32602 }
    )
  }

  const scope = normalizeScope(projectId)
  const userFilter = exactUserScopeFilter(userId)
  const existingResult = await turso.execute({
    sql: `SELECT id
          FROM skill_files
          WHERE path = ?
            AND scope = ?
            AND ${scope === "project" ? "project_id = ?" : "project_id IS NULL"}
            AND ${userFilter.clause}
          ORDER BY deleted_at IS NULL DESC, updated_at DESC
          LIMIT 1`,
    args: [
      normalizedPath,
      scope,
      ...(scope === "project" ? [projectId as string] : []),
      ...userFilter.args,
    ],
  })

  const existingId = String(existingResult.rows[0]?.id ?? "")
  const id = existingId || crypto.randomUUID().replace(/-/g, "").slice(0, 12)
  const created = existingId.length === 0

  if (created) {
    await turso.execute({
      sql: `INSERT INTO skill_files (
              id, path, content, scope, project_id, user_id, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      args: [id, normalizedPath, normalizedContent, scope, projectId || null, userId, nowIso, nowIso],
    })
  } else {
    await turso.execute({
      sql: `UPDATE skill_files
            SET content = ?, updated_at = ?, deleted_at = NULL
            WHERE id = ?`,
      args: [normalizedContent, nowIso, id],
    })
  }

  const skillFileResult = await turso.execute({
    sql: `SELECT id, path, content, scope, project_id, user_id, created_at, updated_at
          FROM skill_files
          WHERE id = ?
          LIMIT 1`,
    args: [id],
  })

  const row = skillFileResult.rows[0] as unknown as SkillFileRow | undefined
  if (!row) {
    throw new ToolExecutionError(
      apiError({
        type: "internal_error",
        code: "SKILL_FILE_UPSERT_READBACK_FAILED",
        message: "Failed to read back skill file after upsert",
        status: 500,
        retryable: true,
      }),
      { rpcCode: -32000 }
    )
  }

  const scopeLabel = scope === "project" && projectId ? `project:${projectId}` : "global"
  const message = `${created ? "Created" : "Updated"} skill file ${normalizedPath} (${scopeLabel})`

  return {
    text: message,
    data: {
      skillFile: toStructuredSkillFile(row),
      created,
      message,
    },
  }
}

export async function listSkillFilesPayload(params: {
  turso: TursoClient
  projectId?: string | null
  userId: string | null
  limit: number
}): Promise<{
  text: string
  data: {
    skillFiles: Array<ReturnType<typeof toStructuredSkillFile>>
    count: number
  }
}> {
  const { turso, projectId, userId, limit } = params
  const normalizedLimit = Math.max(1, Math.min(Math.floor(limit || 50), 500))
  const userFilter = buildUserScopeFilter(userId)

  let sql = `SELECT id, path, content, scope, project_id, user_id, created_at, updated_at
             FROM skill_files
             WHERE deleted_at IS NULL
               AND ${userFilter.clause}
               AND (scope = 'global'`
  const args: (string | number)[] = [...userFilter.args]

  if (projectId) {
    sql += " OR (scope = 'project' AND project_id = ?)"
    args.push(projectId)
  }

  sql += `)
          ORDER BY
            CASE scope WHEN 'project' THEN 0 ELSE 1 END,
            updated_at DESC,
            created_at DESC
          LIMIT ?`
  args.push(normalizedLimit)

  const result = await turso.execute({ sql, args })
  const rows = (result.rows ?? []) as unknown as SkillFileRow[]
  const skillFiles = rows.map((row) => toStructuredSkillFile(row))

  return {
    text: `Found ${skillFiles.length} skill file${skillFiles.length === 1 ? "" : "s"}`,
    data: {
      skillFiles,
      count: skillFiles.length,
    },
  }
}

export async function deleteSkillFilePayload(params: {
  turso: TursoClient
  path: string
  projectId?: string | null
  userId: string | null
  nowIso: string
}): Promise<{
  text: string
  data: {
    path: string
    deleted: true
    message: string
  }
}> {
  const { turso, path, projectId, userId, nowIso } = params
  const normalizedPath = path.trim()
  if (!normalizedPath) {
    throw new ToolExecutionError(
      apiError({
        type: "validation_error",
        code: "SKILL_FILE_PATH_REQUIRED",
        message: "skill file path is required",
        status: 400,
        retryable: false,
        details: { field: "path" },
      }),
      { rpcCode: -32602 }
    )
  }

  const scope = normalizeScope(projectId)
  const userFilter = exactUserScopeFilter(userId)

  const result = await turso.execute({
    sql: `UPDATE skill_files
          SET deleted_at = ?, updated_at = ?
          WHERE path = ?
            AND scope = ?
            AND ${scope === "project" ? "project_id = ?" : "project_id IS NULL"}
            AND ${userFilter.clause}
            AND deleted_at IS NULL`,
    args: [
      nowIso,
      nowIso,
      normalizedPath,
      scope,
      ...(scope === "project" ? [projectId as string] : []),
      ...userFilter.args,
    ],
  })

  if ((result.rowsAffected ?? 0) === 0) {
    throw new ToolExecutionError(
      apiError({
        type: "not_found_error",
        code: "SKILL_FILE_NOT_FOUND",
        message: "Skill file not found for this scope",
        status: 404,
        retryable: false,
        details: {
          path: normalizedPath,
          scope,
          projectId: projectId || null,
          userId,
        },
      }),
      { rpcCode: -32004 }
    )
  }

  const message = `Deleted skill file ${normalizedPath}`
  return {
    text: message,
    data: {
      path: normalizedPath,
      deleted: true,
      message,
    },
  }
}
