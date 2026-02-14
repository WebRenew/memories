import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          supabaseResponse = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect /app routes — redirect to /login if not authenticated
  if (!user && request.nextUrl.pathname.startsWith("/app")) {
    const url = request.nextUrl.clone()
    const originalPath = request.nextUrl.pathname + request.nextUrl.search
    url.pathname = "/login"
    url.search = ""
    url.searchParams.set("next", originalPath)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from /login
  if (user && request.nextUrl.pathname === "/login") {
    const rawNext = request.nextUrl.searchParams.get("next") ?? "/app"
    const safeNext =
      rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app"
    // Build a fresh URL to avoid leaking the original ?next=... param
    const redirectUrl = new URL(safeNext, request.nextUrl.origin)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}
