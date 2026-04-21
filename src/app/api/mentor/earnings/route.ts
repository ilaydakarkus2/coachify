import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUsdRate, getPaymentDateForCycle } from "@/lib/mentor-earnings"

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

    // Gelecekteki pending earnings'lari cycle date'e gore sirala
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

    // 3-döngü sınırını ödeme tarihine (1/15) göre uygula
    const uniquePaymentDates = [...new Set(
      upcomingEarnings.map(e => getPaymentDateForCycle(e.cycleDate).getTime())
    )].sort((a, b) => a - b)
      .slice(0, MAX_VISIBLE_UPCOMING_CYCLES)

    const visibleUpcoming = upcomingEarnings.filter(e =>
      uniquePaymentDates.includes(getPaymentDateForCycle(e.cycleDate).getTime())
    )

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

    // Her earning'e paymentDate ekle (frontend gruplama için)
    const earningsWithPaymentDate = visibleEarnings.map(e => ({
      ...e,
      cycleDate: e.cycleDate.toISOString(),
      paymentDate: getPaymentDateForCycle(e.cycleDate).toISOString()
    }))

    return NextResponse.json({
      mentor: { name: mentor.name, specialty: mentor.specialty, email: mentor.email },
      earnings: earningsWithPaymentDate,
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
