import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  throw new Error("Sentry Test Error");
  return NextResponse.json({ data: "ok" });
}
