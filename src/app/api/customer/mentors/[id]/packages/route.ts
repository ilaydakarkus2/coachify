import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const packages = await prisma.package.findMany({
      where: { mentorId: params.id },
      select: {
        id: true,
        title: true,
        price: true,
        duration: true
      },
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json(packages)
  } catch (error) {
    console.error("Error fetching packages:", error)
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 })
  }
}