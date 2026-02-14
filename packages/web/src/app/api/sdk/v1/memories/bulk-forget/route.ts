import { bulkForgetMemoriesPayload } from "@/lib/memory-service/mutations"
import { apiError, ensureMemoryUserIdSchema, parseTenantId, parseUserId, ToolExecutionError } from "@/lib/memory-service/tools"
import {
  authenticateApiKey,
  errorResponse,
  getApiKey,
  invalidRequestResponse,
  resolveTursoForScope,
  successResponse,
} from "@/lib/sdk-api/runtime"
import { memoryTypeSchema, scopeSchema } from "@/lib/sdk-api/schemas"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const ENDPOINT = "/api/sdk/v1/memories/bulk-forget"

const requestSchema = z.object({
  scope: scopeSchema,
  filters: z.object({
    types: z.array(memoryTypeSchema).min(1).optional(),
    tags: z.array(z.string().trim().min(1).max(128)).min(1).optional(),
    olderThanDays: z.number().int().positive().optional(),
    pattern: z.string().trim().min(1).max(500).optional(),
    projectId: z.string().trim().min(1).max(240).optional(),
    all: z.boolean().optional(),
  }).refine(
    (d) => d.all ? !d.types && !d.tags && !d.olderThanDays && !d.pattern :
      (d.types || d.tags || d.olderThanDays || d.pattern),
    { message: "Provide at least one filter (types, tags, olderThanDays, or pattern), or use all:true. projectId alone is not a sufficient filter; all:true cannot be combined with content filters." }
  ),
  dryRun: z.boolean().default(false),
})

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = crypto.randomUUID()

  const apiKey = getApiKey(request)
  if (!apiKey) {
    return errorResponse(
      ENDPOINT,
      requestId,
      apiError({
        type: "auth_error",
        code: "MISSING_API_KEY",
        message: "Missing API key",
        status: 401,
        retryable: false,
      })
    )
  }

  const authResult = await authenticateApiKey(apiKey, ENDPOINT, requestId)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  let parsedRequest: z.infer<typeof requestSchema>
  try {
    parsedRequest = requestSchema.parse(await request.json())
  } catch {
    return invalidRequestResponse(ENDPOINT, requestId)
  }

  try {
    const tenantId = parseTenantId({ tenant_id: parsedRequest.scope?.tenantId })
    const userId = parseUserId({ user_id: parsedRequest.scope?.userId })
    const projectId = parsedRequest.scope?.projectId

    const turso = await resolveTursoForScope({
      ownerUserId: authResult.userId,
      apiKeyHash: authResult.apiKeyHash,
      tenantId,
      projectId,
      endpoint: ENDPOINT,
      requestId,
    })

    if (turso instanceof NextResponse) {
      return turso
    }

    await ensureMemoryUserIdSchema(turso)

    const payload = await bulkForgetMemoriesPayload({
      turso,
      args: {
        types: parsedRequest.filters.types,
        tags: parsedRequest.filters.tags,
        older_than_days: parsedRequest.filters.olderThanDays,
        pattern: parsedRequest.filters.pattern,
        project_id: parsedRequest.filters.projectId,
        all: parsedRequest.filters.all,
        dry_run: parsedRequest.dryRun,
      },
      userId,
      nowIso: new Date().toISOString(),
      onlyWorkingLayer: true,
    })

    return successResponse(ENDPOINT, requestId, payload.data)
  } catch (error) {
    const detail =
      error instanceof ToolExecutionError
        ? error.detail
        : apiError({
            type: "internal_error",
            code: "INTERNAL_ERROR",
            message: "Internal error",
            status: 500,
            retryable: true,
          })

    return errorResponse(ENDPOINT, requestId, detail)
  }
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
