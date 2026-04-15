import { NextRequest, NextResponse } from "next/server"
import { prisma, getAdminUserId } from "@/lib/prisma"
import { calculatePendingEarnings } from "@/lib/mentor-earnings"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mentorId = searchParams.get("mentorId")
    const studentId = searchParams.get("studentId")
    const status = searchParams.get("status")
    const cycleDateFrom = searchParams.get("cycleDateFrom")
    const cycleDateTo = searchParams.get("cycleDateTo")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")

    const where = {
      ...(mentorId && { mentorId }),
      ...(studentId && { studentId }),
      ...(status && { status }),
      ...(cycleDateFrom && { cycleDate: { gte: new Date(cycleDateFrom) } }),
      ...(cycleDateTo && { cycleDate: { lte: new Date(cycleDateTo) } })
    }

    // Sayfali veri + toplam sayi + durum bazli ozetler paralel cek
    const [earnings, total, aggPending, aggPaid, aggAll] = await Promise.all([
      prisma.mentorEarning.findMany({
        include: {
          mentor: {
            select: {
              id: true,
              name: true,
              email: true,
              specialty: true
            }
          },
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              school: true,
              grade: true,
              status: true
            }
          },
          assignment: {
            select: {
              id: true,
              startDate: true,
              endDate: true
            }
          }
        },
        where,
        orderBy: { cycleDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.mentorEarning.count({ where }),
      prisma.mentorEarning.aggregate({ where: { ...where, status: "pending" }, _sum: { amount: true } }),
      prisma.mentorEarning.aggregate({ where: { ...where, status: "paid" }, _sum: { amount: true } }),
      prisma.mentorEarning.aggregate({ where, _sum: { amount: true } }),
    ])

    return NextResponse.json({
      earnings,
      total,
      page,
      pageSize,
      summary: {
        totalPending: aggPending._sum.amount || 0,
        totalPaid: aggPaid._sum.amount || 0,
        totalAll: aggAll._sum.amount || 0,
      }
    })
  } catch (error) {
    console.error("Error fetching mentor earnings:", error)
    return NextResponse.json({ error: "Mentor kazançları getirilemedi" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUserId = await getAdminUserId()
    const createdCount = await calculatePendingEarnings(adminUserId)

    return NextResponse.json({
      success: true,
      message: `${createdCount} yeni hakediş kaydı oluşturuldu`,
      createdCount
    })
  } catch (error) {
    console.error("Error calculating pending earnings:", error)
    return NextResponse.json({ error: "Hakediş hesaplaması başarısız" }, { status: 500 })
  }
}
