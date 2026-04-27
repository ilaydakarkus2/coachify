import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateCSV, csvResponse, formatDate } from "@/lib/csv-export"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const mentorId = searchParams.get("mentorId")
    const paymentStatus = searchParams.get("paymentStatus")
    const search = searchParams.get("search")

    let searchCondition = {}
    if (search) {
      const searchTRLower = search.toLocaleLowerCase("tr-TR")
      const searchTRUpper = search.toLocaleUpperCase("tr-TR")
      searchCondition = {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { name: { contains: searchTRLower, mode: "insensitive" as const } },
          { name: { contains: searchTRUpper, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search } },
          { parentPhone: { contains: search } },
          { parentName: { contains: search, mode: "insensitive" as const } },
          { parentName: { contains: searchTRLower, mode: "insensitive" as const } },
          { parentName: { contains: searchTRUpper, mode: "insensitive" as const } },
        ],
      }
    }

    const where = {
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
      ...(mentorId && {
        studentAssignments: { some: { mentorId, endDate: null } },
      }),
      ...(search && searchCondition),
    }

    const students = await prisma.student.findMany({
      include: {
        studentAssignments: {
          where: { endDate: null },
          include: { mentor: { select: { name: true } } },
          take: 1,
        },
      },
      where,
      orderBy: { createdAt: "desc" },
    })

    const headers = [
      "Ad", "E-posta", "Telefon", "Sinif", "Durum", "Odeme Durumu",
      "Mentor", "Baslangic", "Bitis", "Veli Adi", "Veli Telefonu",
      "Paket", "Uyelik Tipi", "Indirim Kodu", "Ozel Not",
    ]

    const rows = students.map((s: any) => ({
      Ad: s.name,
      "E-posta": s.email || "",
      Telefon: s.phone || "",
      Sinif: s.grade || "",
      Durum: s.status || "",
      "Odeme Durumu": s.paymentStatus || "",
      Mentor: s.studentAssignments?.[0]?.mentor?.name || "",
      Baslangic: formatDate(s.startDate),
      Bitis: formatDate(s.endDate),
      "Veli Adi": s.parentName || "",
      "Veli Telefonu": s.parentPhone || "",
      Paket: s.packageType || "",
      "Uyelik Tipi": s.membershipType || "",
      "Indirim Kodu": s.discountCode || "",
      "Ozel Not": s.specialNote || "",
    }))

    const csv = generateCSV(headers, rows)
    const date = new Date().toISOString().slice(0, 10)
    return csvResponse(csv, `ogrenci-listesi-${date}.csv`)
  } catch (error) {
    console.error("[API] Error exporting students:", error)
    return new Response("Export failed", { status: 500 })
  }
}
