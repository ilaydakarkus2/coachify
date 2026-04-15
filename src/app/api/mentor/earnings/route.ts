import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma, getAdminUserId } from "@/lib/prisma"
import { calculatePendingEarningsForMentor } from "@/lib/mentor-earnings"

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

    // Otomatik hakedis hesaplama — mentor panelini actiginda guncel veriler gormesi icin
    try {
      const adminUserId = await getAdminUserId()
      const calcResult = await calculatePendingEarningsForMentor(mentor.id, adminUserId)
      console.log(`[MENTOR/EARNINGS] Auto-calc created ${calcResult} records for mentor ${mentor.id}`)
    } catch (calcError) {
      console.error("[MENTOR/EARNINGS] Auto-calculation error:", calcError)
      // Hesaplama hatasi olsa bile mevcut kayitlari gostermeye devam et
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
