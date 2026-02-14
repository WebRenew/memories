import { successResponse } from "@/lib/sdk-api/runtime"

const ENDPOINT = "/api/sdk/v1/health"

export async function GET(): Promise<Response> {
  return successResponse(ENDPOINT, crypto.randomUUID(), {
    status: "ok",
    service: "memories-sdk",
    schemaVersion: "2026-02-11",
  })
}
