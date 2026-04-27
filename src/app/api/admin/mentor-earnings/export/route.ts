import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateCSV, csvResponse, formatDate } from "@/lib/csv-export"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mentorId = searchParams.get("mentorId")
    const studentId = searchParams.get("studentId")
    const status = searchParams.get("status")

    const where = {
      ...(mentorId && { mentorId }),
      ...(studentId && { studentId }),
      ...(status && { status }),
    }

    const earnings = await prisma.mentorEarning.findMany({
      include: {
        mentor: { select: { name: true } },
        student: { select: { name: true } },
      },
      where,
      orderBy: { cycleDate: "desc" },
    })

    const headers = [
      "Mentor", "Ogrenci", "Tamamlanan Hafta", "Tutar (TL)",
      "Haftalik Rate (TL)", "Donem Tarihi", "Durum",
      "Tetik Nedeni", "Olusturulma Tarihi",
    ]

    const rows = earnings.map((e: any) => ({
      Mentor: e.mentor?.name || "",
      Ogrenci: e.student?.name || "",
      "Tamamlanan Hafta": e.completedWeeks ?? "",
      "Tutar (TL)": e.amount ?? "",
      "Haftalik Rate (TL)": e.weeklyRate ?? "",
      "Donem Tarihi": formatDate(e.cycleDate),
      Durum: e.status || "",
      "Tetik Nedeni": e.triggerReason || "",
      "Olusturulma Tarihi": formatDate(e.createdAt),
    }))

    const csv = generateCSV(headers, rows)
    const date = new Date().toISOString().slice(0, 10)
    return csvResponse(csv, `hakedis-listesi-${date}.csv`)
  } catch (error) {
    console.error("[API] Error exporting mentor earnings:", error)
    return new Response("Export failed", { status: 500 })
  }
}
