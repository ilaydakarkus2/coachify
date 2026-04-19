import { NextRequest, NextResponse } from "next/server"
import { prisma, getAdminUserId } from "@/lib/prisma"

type RouteParams = { params: Promise<{ id: string }> }

/**
 * UTC-guvenli ay ekleme. Ay sonu tasmasini onler (31 Ocak + 1 ay = 28/29 Subat).
 */
function addUTCMonths(date: Date, months: number): Date {
  const totalMonths = date.getUTCMonth() + months
  const year = date.getUTCFullYear() + Math.floor(totalMonths / 12)
  const month = totalMonths % 12
  const maxDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(date.getUTCDate(), maxDay)
  return new Date(Date.UTC(year, month, day))
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { months, reason } = body

    if (!months || months < 1) {
      return NextResponse.json(
        { error: "Ay sayısı 1 veya daha büyük olmalıdır" },
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

    const oldEndDate = student.endDate
    const baseDate = toUTCDay(oldEndDate ? new Date(oldEndDate) : new Date(student.startDate))
    const newEndDate = addUTCMonths(baseDate, months)

    const adminUserId = await getAdminUserId()

    await prisma.$transaction(async (tx) => {
      // 1. Student endDate guncelle
      await tx.student.update({
        where: { id },
        data: { endDate: newEndDate }
      })

      // 2. Aktif assignment'larin endDate'ini de guncelle (earnings hesaplamasinin dogru calismasi icin)
      // Not: Aktif assignment'lar endDate=null tutar, bu yuzden student.endDate uzerinden cap yapilir
      // Ama bitmis assignment'lara dokunmamaliyiz

      // 3. Log
      await tx.log.create({
        data: {
          entityType: "student",
          entityId: id,
          action: "membership_extended",
          description: `${student.name} üyelik süresi ${months} ay uzatıldı`,
          userId: adminUserId,
          studentId: id,
          metadata: {
            oldEndDate: oldEndDate?.toISOString() ?? null,
            newEndDate: newEndDate.toISOString(),
            months,
            reason: reason || null
          }
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: `${student.name} üyelik süresi ${months} ay uzatıldı`,
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

function toUTCDay(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}
