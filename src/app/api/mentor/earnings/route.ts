import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "mentor") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }

    const mentor = await prisma.mentor.findUnique({
      where: { userId: session.user.id }
    })
    if (!mentor) {
      return NextResponse.json({ error: "Mentor profili bulunamadı" }, { status: 404 })
    }

    const earnings = await prisma.mentorEarning.findMany({
      where: { mentorId: mentor.id },
      include: {
        student: {
          select: { id: true, name: true, email: true, school: true, grade: true, status: true }
        },
        assignment: {
          select: { startDate: true, endDate: true }
        }
      },
      orderBy: { cycleDate: "desc" }
    })

    const totalEarned = earnings
      .filter(e => e.status === "paid")
      .reduce((sum, e) => sum + e.amount, 0)

    const totalPending = earnings
      .filter(e => e.status === "pending")
      .reduce((sum, e) => sum + e.amount, 0)

    return NextResponse.json({
      mentor: { name: mentor.name, specialty: mentor.specialty, email: mentor.email },
      earnings,
      summary: {
        totalEarned,
        totalPending,
        totalRecords: earnings.length,
        paidCount: earnings.filter(e => e.status === "paid").length,
        pendingCount: earnings.filter(e => e.status === "pending").length
      }
    })
  } catch (error) {
    console.error("Error fetching mentor earnings:", error)
    return NextResponse.json({ error: "Kazançlar getirilemedi" }, { status: 500 })
  }
}
