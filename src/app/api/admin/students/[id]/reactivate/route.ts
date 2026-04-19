import { NextRequest, NextResponse } from "next/server"
import { prisma, getAdminUserId } from "@/lib/prisma"

type RouteParams = { params: Promise<{ id: string }> }

/**
 * UTC-guvenli ay ekleme.
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

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        studentAssignments: {
          orderBy: { startDate: "desc" },
          take: 1,
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Ogrenci bulunamadi" }, { status: 404 })
    }

    if (student.status === "active") {
      return NextResponse.json({ error: "Ogrenci zaten aktif" }, { status: 400 })
    }

    const adminUserId = await getAdminUserId()

    // Reactivate icin yeni endDate hesapla (bugunden itibaren 1 ay) — UTC guvenli
    const now = new Date()
    const newEndDate = addUTCMonths(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), 1)

    await prisma.$transaction(async (tx) => {
      // 1. Ogrenciyi aktife cevir
      await tx.student.update({
        where: { id },
        data: {
          status: "active",
          endDate: newEndDate,
          dropReason: null,
          refundStatus: null,
        }
      })

      // 2. Son atamayi yeniden ac (endDate'i kaldir)
      const lastAssignment = student.studentAssignments[0]
      if (lastAssignment && lastAssignment.endDate) {
        await tx.studentAssignment.update({
          where: { id: lastAssignment.id },
          data: { endDate: null }
        })
      }

      // 3. Sonlandirma sirasinda olusturulmus hakedisleri IPTAL ET (silme — audit trail korunur)
      await tx.mentorEarning.updateMany({
        where: {
          studentId: id,
          triggerReason: { in: ["student_drop", "student_refund", "student_refund_14day"] },
          status: { not: "paid" } // Odenmis kayitlara dokunma
        },
        data: { status: "cancelled" }
      })

      // Periodic_calc ile olusturulmus iptal edilmis kayitlari da sil
      // (ki yeniden hesaplama yapilabilsin — bunlar zaten cancelled, audit trail kaybi yok)
      await tx.mentorEarning.deleteMany({
        where: {
          studentId: id,
          triggerReason: "periodic_calc",
          status: "cancelled",
        }
      })

      // Periodic_calc ile olusturulmus pending kayitlari da iptal et
      await tx.mentorEarning.updateMany({
        where: {
          studentId: id,
          triggerReason: "periodic_calc",
          status: "pending",
        },
        data: { status: "cancelled" }
      })

      // 4. Log
      await tx.log.create({
        data: {
          entityType: "student",
          entityId: id,
          action: "reactivated",
          description: `Ogrenci yeniden aktiflestirildi: ${student.name} (onceki durum: ${student.status})`,
          userId: adminUserId,
          studentId: id,
          metadata: {
            previousStatus: student.status,
            newStatus: "active",
            previousEndDate: student.endDate,
            reopenedAssignmentId: lastAssignment?.id || null,
          }
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error reactivating student:", error)
    return NextResponse.json({ error: "Ogrenci yeniden aktiflestirilemedi" }, { status: 500 })
  }
}
