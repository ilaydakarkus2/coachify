import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Mentor rotalarini koru
  if (pathname.startsWith("/mentor")) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token || token.role !== "mentor") {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  // Admin rotalarini koru
  if (pathname.startsWith("/admin")) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token || token.role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  // Mentor API rotalarini koru
  if (pathname.startsWith("/api/mentor")) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token || token.role !== "mentor") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/mentor/:path*", "/admin/:path*", "/api/mentor/:path*"],
}
