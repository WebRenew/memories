import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
    // Basic health check - can be extended to check database, etc.
    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
