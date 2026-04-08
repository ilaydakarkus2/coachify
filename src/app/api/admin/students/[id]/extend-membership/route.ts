import { NextRequest, NextResponse } from "next/server"
import { prisma, getAdminUserId } from "@/lib/prisma"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { weeks, reason } = body

    if (!weeks || weeks < 1) {
      return NextResponse.json(
        { error: "Hafta sayısı 1 veya daha büyük olmalıdır" },
        { status: 400 }
      )
    }

    const student = await prisma.student.findUnique({
      where: { id }
    })

    if (!student) {
      return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 })
    }

    if (student.status !== "active") {
      return NextResponse.json(
        { error: "Sadece aktif öğrencilerin üyelik süresi uzatılabilir" },
        { status: 400 }
      )
    }

    const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
    const oldEndDate = student.endDate

    let newEndDate: Date
    if (oldEndDate) {
      newEndDate = new Date(oldEndDate.getTime() + weeks * MS_PER_WEEK)
    } else {
      newEndDate = new Date(student.startDate.getTime() + (student.packageDuration + weeks) * MS_PER_WEEK)
    }

    const adminUserId = await getAdminUserId()

    await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id },
        data: { endDate: newEndDate }
      })

      await tx.log.create({
        data: {
          entityType: "student",
          entityId: id,
          action: "membership_extended",
          description: `${student.name} üyelik süresi ${weeks} hafta uzatıldı`,
          userId: adminUserId,
          studentId: id,
          metadata: {
            oldEndDate: oldEndDate?.toISOString() ?? null,
            newEndDate: newEndDate.toISOString(),
            weeks,
            reason: reason || null
          }
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: `${student.name} üyelik süresi ${weeks} hafta uzatıldı`,
      oldEndDate,
      newEndDate
    })
  } catch (error) {
    console.error("[API] Error extending membership:", error)
    return NextResponse.json(
      { error: "Üyelik süresi uzatılırken bir hata oluştu" },
      { status: 500 }
    )
  }
}
