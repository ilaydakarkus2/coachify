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
      where: { userId: session.user.id },
    })
    if (!mentor) {
      return NextResponse.json({ error: "Mentor profili bulunamadı" }, { status: 404 })
    }

    // Tum assignment'lari getir (aktif + gecmis)
    const assignments = await prisma.studentAssignment.findMany({
      where: { mentorId: mentor.id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            phone: true,
            school: true,
            grade: true,
            startDate: true,
            status: true,
            currentNetScore: true,
            targetNetScore: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    })

    // Aktif: endDate null olanlar
    const active = assignments
      .filter((a) => a.endDate === null)
      .map((a) => ({
        studentId: a.student.id,
        name: a.student.name,
        phone: a.student.phone,
        school: a.student.school,
        grade: a.student.grade,
        studentStartDate: a.student.startDate,
        status: a.student.status,
        assignmentStartDate: a.startDate,
        currentNetScore: a.student.currentNetScore,
        targetNetScore: a.student.targetNetScore,
      }))

    // Gecmis: endDate dolu olanlar (mentor değişikliği veya öğrenci bırakma)
    const past = assignments
      .filter((a) => a.endDate !== null)
      .map((a) => ({
        studentId: a.student.id,
        name: a.student.name,
        phone: a.student.phone,
        school: a.student.school,
        grade: a.student.grade,
        studentStartDate: a.student.startDate,
        status: a.student.status,
        assignmentStartDate: a.startDate,
        currentNetScore: a.student.currentNetScore,
        targetNetScore: a.student.targetNetScore,
      }))

    return NextResponse.json({
      mentor: { name: mentor.name, specialty: mentor.specialty, email: mentor.email },
      active,
      past,
      summary: { totalActive: active.length, totalPast: past.length },
    })
  } catch (error) {
    console.error("[MENTOR API] Error fetching students:", error)
    return NextResponse.json({ error: "Öğrenciler getirilemedi" }, { status: 500 })
  }
}
