import { prisma } from "@/lib/prisma"
import { generateCSV, csvResponse, formatDate } from "@/lib/csv-export"

export async function GET() {
  try {
    const mentors = await prisma.mentor.findMany({
      include: {
        user: { select: { email: true } },
        _count: { select: { studentAssignments: { where: { endDate: null } } } },
      },
      orderBy: { createdAt: "desc" },
    })

    const headers = [
      "Ad", "E-posta", "Uzmanlik", "Aktif Ogrenci Sayisi", "Olusturulma Tarihi",
    ]

    const rows = mentors.map((m: any) => ({
      Ad: m.name,
      "E-posta": m.email || m.user?.email || "",
      Uzmanlik: m.specialty || "",
      "Aktif Ogrenci Sayisi": m._count?.studentAssignments ?? 0,
      "Olusturulma Tarihi": formatDate(m.createdAt),
    }))

    const csv = generateCSV(headers, rows)
    const date = new Date().toISOString().slice(0, 10)
    return csvResponse(csv, `mentor-listesi-${date}.csv`)
  } catch (error) {
    console.error("[API] Error exporting mentors:", error)
    return new Response("Export failed", { status: 500 })
  }
}
