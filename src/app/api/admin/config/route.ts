import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
    }

    const usdRate = await prisma.systemConfig.findUnique({ where: { key: "USD_EXCHANGE_RATE" } })
    const weeklyRate = await prisma.systemConfig.findUnique({ where: { key: "WEEKLY_MENTOR_RATE" } })

    return NextResponse.json({
      usdRate: usdRate ? parseFloat(usdRate.value) : 0,
      weeklyRate: weeklyRate ? parseFloat(weeklyRate.value) : 375,
    })
  } catch (error) {
    console.error("Error fetching config:", error)
    return NextResponse.json({ error: "Config getirilemedi" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
    }

    const body = await request.json()
    const updates: Promise<any>[] = []

    if (body.usdRate !== undefined) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: "USD_EXCHANGE_RATE" },
          create: { key: "USD_EXCHANGE_RATE", value: String(body.usdRate), notes: "USD/TRY kuru" },
          update: { value: String(body.usdRate) }
        })
      )
    }

    if (body.weeklyRate !== undefined) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: "WEEKLY_MENTOR_RATE" },
          create: { key: "WEEKLY_MENTOR_RATE", value: String(body.weeklyRate), notes: "Haftalık mentor ödeme tutarı (TL)" },
          update: { value: String(body.weeklyRate) }
        })
      )
    }

    await Promise.all(updates)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating config:", error)
    return NextResponse.json({ error: "Config güncellenemedi" }, { status: 500 })
  }
}
