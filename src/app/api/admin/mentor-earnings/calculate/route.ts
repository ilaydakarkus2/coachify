import { NextResponse } from "next/server"
import { getAdminUserId } from "@/lib/prisma"
import { calculatePendingEarnings } from "@/lib/mentor-earnings"

export async function POST() {
  try {
    const adminUserId = await getAdminUserId()
    const createdCount = await calculatePendingEarnings(adminUserId)

    // Log
    try {
      const { prisma } = await import("@/lib/prisma")
      await prisma.log.create({
        data: {
          entityType: "mentorEarning",
          entityId: "batch",
          action: "payment_processed",
          description: `Toplu hakediş hesaplaması tamamlandı. ${createdCount} yeni kayıt oluşturuldu.`,
          userId: adminUserId,
          metadata: { createdCount }
        }
      })
    } catch (logError) {
      console.error("Warning: Failed to create log:", logError)
    }

    return NextResponse.json({
      success: true,
      message: `${createdCount} yeni hakediş kaydı oluşturuldu`,
      createdCount
    })
  } catch (error) {
    console.error("Error in batch calculation:", error)
    return NextResponse.json({ error: "Toplu hesaplama başarısız" }, { status: 500 })
  }
}
