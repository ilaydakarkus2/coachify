import { NextRequest, NextResponse } from "next/server"
import { prisma, getAdminUserId } from "@/lib/prisma"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, notes } = body

    if (!status || !["paid", "cancelled", "pending"].includes(status)) {
      return NextResponse.json(
        { error: "Geçersiz durum. 'paid', 'cancelled' veya 'pending' olmalı" },
        { status: 400 }
      )
    }

    const existing = await prisma.mentorEarning.findUnique({
      where: { id },
      include: {
        mentor: { select: { name: true } },
        student: { select: { name: true } }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: "Hakediş kaydı bulunamadı" }, { status: 404 })
    }

    // Durum geçiş validasyonu
    const validTransitions: Record<string, string[]> = {
      pending: ["paid", "cancelled"],
      paid: ["pending"],  // Geri alma (undo) izinli
      cancelled: ["pending"],  // Geri alma (undo) izinli
    }
    if (!validTransitions[existing.status]?.includes(status)) {
      return NextResponse.json(
        { error: `'${existing.status}' durumundan '${status}' durumuna geçiş yapılamaz` },
        { status: 400 }
      )
    }

    const earning = await prisma.mentorEarning.update({
      where: { id },
      data: {
        status,
        ...(status === "paid" ? { paidAt: new Date() } : {}),
        ...(status === "pending" && existing.status === "paid" ? { paidAt: null } : {}),
        ...(notes !== undefined && { notes })
      }
    })

    // Log
    const adminUserId = await getAdminUserId()
    try {
      await prisma.log.create({
        data: {
          entityType: "mentorEarning",
          entityId: id,
          action: "status_changed",
          description: `${existing.mentor.name} - ${existing.student.name}: ${existing.amount} TL hakediş durumu '${status}' olarak güncellendi`,
          userId: adminUserId,
          studentId: existing.studentId,
          metadata: {
            previousStatus: existing.status,
            newStatus: status,
            amount: existing.amount,
            mentorName: existing.mentor.name,
            studentName: existing.student.name
          }
        }
      })
    } catch (logError) {
      console.error("Warning: Failed to create log:", logError)
    }

    return NextResponse.json({ success: true, earning })
  } catch (error) {
    console.error("Error updating mentor earning:", error)
    return NextResponse.json({ error: "Hakediş güncellenemedi" }, { status: 500 })
  }
}
