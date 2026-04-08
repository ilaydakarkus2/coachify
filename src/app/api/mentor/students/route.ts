import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "mentor") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }

    const mentor = await prisma.mentor.findUnique({
      where: { userId: session.user.id }
    })
    if (!mentor) {
      return NextResponse.json({ error: "Mentor profili bulunamadı" }, { status: 404 })
    }

    const assignments = await prisma.studentAssignment.findMany({
      where: { mentorId: mentor.id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            school: true,
            grade: true,
            status: true,
            startDate: true,
            endDate: true
          }
        }
      },
      orderBy: { startDate: "desc" }
    })

    const activeStudents = assignments.filter(a => !a.endDate && a.student.status === "active").length
    const totalStudents = assignments.length

    return NextResponse.json({
      assignments,
      summary: { activeStudents, totalStudents }
    })
  } catch (error) {
    console.error("Error fetching mentor students:", error)
    return NextResponse.json({ error: "Öğrenciler getirilemedi" }, { status: 500 })
  }
}
