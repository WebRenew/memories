import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, publicRateLimit } from "@/lib/rate-limit";

export const runtime = "edge";
const CACHE_CONTROL_HEALTH = "public, s-maxage=30, stale-while-revalidate=120";

export async function GET(request: Request): Promise<Response> {
  const rateLimited = await checkRateLimit(publicRateLimit, getClientIp(request));
  if (rateLimited) {
    return rateLimited;
  }

  try {
    // Basic health check - can be extended to check database, etc.
    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": CACHE_CONTROL_HEALTH,
        },
      }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": CACHE_CONTROL_HEALTH,
        },
      }
    );
  }
}
