import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get("entityType")
    const action = searchParams.get("action")
    const userId = searchParams.get("userId")
    const studentId = searchParams.get("studentId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limit = parseInt(searchParams.get("limit") || "50")

    const logs = await prisma.log.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      where: {
        ...(entityType && { entityType }),
        ...(action && { action }),
        ...(userId && { userId }),
        ...(studentId && { studentId }),
        ...(startDate && { createdAt: { gte: new Date(startDate) } }),
        ...(endDate && { createdAt: { lte: new Date(endDate) } })
      },
      orderBy: { createdAt: "desc" },
      take: limit
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error("Error fetching logs:", error)
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}
