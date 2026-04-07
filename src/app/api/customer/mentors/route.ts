import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const mentors = await prisma.mentor.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json(mentors)
  } catch (error) {
    console.error("Error fetching mentors:", error)
    return NextResponse.json({ error: "Failed to fetch mentors" }, { status: 500 })
  }
}