import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Tek getToken cagrisi - path'e gore rol kontrolu yap
  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin")
  const isMentor = pathname.startsWith("/mentor") || pathname.startsWith("/api/mentor")

  if (!isAdmin && !isMentor) return NextResponse.next()

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    return isAdmin
      ? NextResponse.redirect(new URL("/login", request.url)).headers.get("x-middleware-request")?.startsWith("text/html")
        ? NextResponse.redirect(new URL("/login", request.url))
        : NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url))
  }

  const requiredRole = isAdmin ? "admin" : "mentor"
  if (token.role !== requiredRole) {
    const isApi = pathname.startsWith("/api/")
    return isApi
      ? NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/mentor/:path*", "/admin/:path*", "/api/mentor/:path*", "/api/admin/:path*"],
}
