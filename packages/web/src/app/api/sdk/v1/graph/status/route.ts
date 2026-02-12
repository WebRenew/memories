import { getGraphStatusPayload } from "@/lib/memory-service/graph/status"
import { apiError, parseTenantId, parseUserId, ToolExecutionError } from "@/lib/memory-service/tools"
import {
  authenticateApiKey,
  errorResponse,
  getApiKey,
  invalidRequestResponse,
  resolveTursoForScope,
  successResponse,
} from "@/lib/sdk-api/runtime"
import { scopeSchema } from "@/lib/sdk-api/schemas"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const ENDPOINT = "/api/sdk/v1/graph/status"

const requestSchema = z.object({
  topNodesLimit: z.number().int().positive().max(50).optional(),
  scope: scopeSchema,
})

function parseGetQuery(request: NextRequest): z.infer<typeof requestSchema> {
  const url = new URL(request.url)
  const topNodesLimitRaw = url.searchParams.get("topNodesLimit")
  const topNodesLimit = topNodesLimitRaw === null ? undefined : Number.parseInt(topNodesLimitRaw, 10)
  return requestSchema.parse({
    topNodesLimit,
    scope: {
      tenantId: url.searchParams.get("tenantId") ?? undefined,
      userId: url.searchParams.get("userId") ?? undefined,
      projectId: url.searchParams.get("projectId") ?? undefined,
    },
  })
}

async function handleStatusRequest(
  request: NextRequest,
  parseInput: () => Promise<z.infer<typeof requestSchema>>
): Promise<NextResponse> {
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
    parsedRequest = await parseInput()
  } catch {
    return invalidRequestResponse(ENDPOINT, requestId)
  }

  try {
    const tenantId = parseTenantId({ tenant_id: parsedRequest.scope?.tenantId })
    const userId = parseUserId({ user_id: parsedRequest.scope?.userId })
    const projectId = parsedRequest.scope?.projectId ?? null

    const turso = await resolveTursoForScope({
      ownerUserId: authResult.userId,
      apiKeyHash: authResult.apiKeyHash,
      tenantId,
      endpoint: ENDPOINT,
      requestId,
    })

    if (turso instanceof NextResponse) {
      return turso
    }

    const payload = await getGraphStatusPayload({
      turso,
      nowIso: new Date().toISOString(),
      topNodesLimit: parsedRequest.topNodesLimit ?? 10,
    })

    return successResponse(ENDPOINT, requestId, {
      ...payload,
      scope: {
        tenantId,
        userId,
        projectId,
      },
    })
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

export async function GET(request: NextRequest) {
  return handleStatusRequest(request, async () => parseGetQuery(request))
}

export async function POST(request: NextRequest) {
  return handleStatusRequest(request, async () => requestSchema.parse(await request.json()))
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
