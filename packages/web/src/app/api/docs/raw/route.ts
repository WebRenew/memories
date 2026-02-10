import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { checkRateLimit, getClientIp, publicRateLimit } from "@/lib/rate-limit";

const CACHE_CONTROL_DOCS = "public, s-maxage=300, stale-while-revalidate=86400";
const CACHE_CONTROL_NOT_FOUND = "public, s-maxage=60, stale-while-revalidate=300";

export async function GET(request: NextRequest) {
  const rateLimited = await checkRateLimit(publicRateLimit, getClientIp(request));
  if (rateLimited) {
    return rateLimited;
  }

  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  // Sanitize path to prevent directory traversal
  const sanitizedPath = path.replace(/\.\./g, "").replace(/^\/+/, "");
  
  try {
    // Try to read the MDX file from content/docs
    const filePath = join(process.cwd(), "content", "docs", `${sanitizedPath}.mdx`);
    const content = await readFile(filePath, "utf-8");
    
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": CACHE_CONTROL_DOCS,
      },
    });
  } catch (error) {
    console.error("Failed to read MDX file:", error);
    return NextResponse.json(
      { error: "File not found" },
      {
        status: 404,
        headers: {
          "Cache-Control": CACHE_CONTROL_NOT_FOUND,
        },
      }
    );
  }
}
