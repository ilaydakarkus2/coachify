import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUsdRate } from "@/lib/mentor-earnings"

const MAX_VISIBLE_UPCOMING_CYCLES = 3
const PAGE_SIZE = 50

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

    const now = new Date()

    // Summary: DB-level aggregation (tüm veriyi memory'e çekme)
    const [paidAgg, allEarningsCount] = await Promise.all([
      prisma.mentorEarning.aggregate({
        where: { mentorId: mentor.id, status: "paid" },
        _sum: { amount: true },
        _count: true
      }),
      prisma.mentorEarning.count({
        where: { mentorId: mentor.id, status: { not: "cancelled" } }
      })
    ])

    const totalEarned = Number(paidAgg._sum.amount || 0)

    // Gelecekteki pending earnings'lari cycle date'e gore sirala, ilk 3 cycle'i al
    const upcomingEarnings = await prisma.mentorEarning.findMany({
      where: {
        mentorId: mentor.id,
        status: "pending",
        cycleDate: { gt: now }
      },
      orderBy: { cycleDate: "asc" },
      include: {
        student: { select: { id: true, name: true, email: true, school: true, grade: true, status: true } },
        assignment: { select: { startDate: true, endDate: true } }
      }
    })

    const visibleCycleDates = [...new Set(upcomingEarnings.map(e => e.cycleDate.getTime()))]
      .sort((a, b) => a - b)
      .slice(0, MAX_VISIBLE_UPCOMING_CYCLES)

    const visibleUpcomingIds = new Set(
      upcomingEarnings
        .filter(e => visibleCycleDates.includes(e.cycleDate.getTime()))
        .map(e => e.id)
    )

    const visibleUpcoming = upcomingEarnings.filter(e => visibleUpcomingIds.has(e.id))

    const totalPending = visibleUpcoming.reduce((sum, e) => sum + Number(e.amount), 0)

    // Gecmis earnings: paid, cancelled, veya cycleDate <= now (pagination ile)
    const pastEarnings = await prisma.mentorEarning.findMany({
      where: {
        mentorId: mentor.id,
        OR: [
          { status: "paid" },
          { status: "cancelled" },
          { cycleDate: { lte: now } }
        ]
      },
      orderBy: { cycleDate: "desc" },
      take: PAGE_SIZE,
      include: {
        student: { select: { id: true, name: true, email: true, school: true, grade: true, status: true } },
        assignment: { select: { startDate: true, endDate: true } }
      }
    })

    const visibleEarnings = [
      ...pastEarnings,
      ...visibleUpcoming
    ]

    // Sirala
    visibleEarnings.sort((a, b) => new Date(b.cycleDate).getTime() - new Date(a.cycleDate).getTime())

    const usdRate = await getUsdRate()

    return NextResponse.json({
      mentor: { name: mentor.name, specialty: mentor.specialty, email: mentor.email },
      earnings: visibleEarnings,
      usdRate,
      summary: {
        totalEarned,
        totalPending,
        totalRecords: allEarningsCount,
        paidCount: paidAgg._count,
        pendingCount: visibleUpcoming.length
      }
    })
  } catch (error) {
    console.error("Error fetching mentor earnings:", error)
    return NextResponse.json({ error: "Kazançlar getirilemedi" }, { status: 500 })
  }
}
