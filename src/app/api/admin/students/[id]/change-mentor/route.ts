import { NextRequest, NextResponse } from "next/server"
import { prisma, getAdminUserId } from "@/lib/prisma"
import { finalizeMentorEarningForAssignment } from "@/lib/mentor-earnings"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Params'ı Promise olarak tanımladık
) {
  try {
    // 1. ADIM: params'ı bekleyip içindeki id'yi alıyoruz
    const { id: studentId } = await params;

    const body = await request.json()
    const { newMentorId, startDate, notes } = body

    if (!newMentorId || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields: newMentorId and startDate are required" },
        { status: 400 }
      )
    }

    // Get student
    const student = await prisma.student.findUnique({
      where: { id: studentId }, // params.id yerine studentId kullandık
      include: {
        studentAssignments: {
          where: { endDate: null },
          include: {
            mentor: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { startDate: "desc" }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Check if new mentor exists
    const newMentor = await prisma.mentor.findUnique({
      where: { id: newMentorId }
    })

    if (!newMentor) {
      return NextResponse.json({ error: "New mentor not found" }, { status: 404 })
    }

    // Get admin user ID for logging before transaction
    const adminUserId = await getAdminUserId()

    // Use a transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // End all active assignments for this student
      await tx.studentAssignment.updateMany({
        where: {
          studentId: studentId,
          endDate: null
        },
        data: {
          endDate: new Date()
        }
      })

      // Finalize mentor earnings for ended assignments
      const endDate = new Date()
      for (const assignment of student.studentAssignments) {
        await finalizeMentorEarningForAssignment(
          tx,
          assignment.id,
          assignment.mentorId,
          student.id,
          assignment.startDate,
          endDate,
          "assignment_end",
          adminUserId,
          student.purchaseDate ?? student.startDate
        )
      }

      // Log ended assignments
      for (const assignment of student.studentAssignments) {
        await tx.log.create({
          data: {
            entityType: "assignment",
            entityId: assignment.id,
            action: "updated",
            description: `Ended assignment for ${student.name} with mentor ${assignment.mentor.name}`,
            userId: adminUserId,
            studentId: student.id,
            metadata: {
              previousMentorId: assignment.mentor.id,
              previousMentorName: assignment.mentor.name,
              endDate: new Date().toISOString()
            }
          }
        })
      }

      // Create new assignment
      // Aynı studentId+mentorId+startDate ile bitmiş bir kayıt varsa sil
      const existingConflict = await tx.studentAssignment.findFirst({
        where: {
          studentId: studentId,
          mentorId: newMentorId,
          startDate: new Date(startDate),
          endDate: { not: null }
        }
      })
      if (existingConflict) {
        await tx.studentAssignment.delete({ where: { id: existingConflict.id } })
      }

      const newAssignment = await tx.studentAssignment.create({
        data: {
          studentId: studentId,
          mentorId: newMentorId,
          startDate: new Date(startDate),
          notes: notes || null
        }
      })

      // Log the new assignment
      await tx.log.create({
        data: {
          entityType: "assignment",
          entityId: newAssignment.id,
          action: "created",
          description: `Assigned ${student.name} to new mentor ${newMentor.name}`,
          userId: adminUserId,
          studentId: student.id,
          metadata: {
            mentorId: newMentorId,
            mentorName: newMentor.name,
            startDate
          }
        }
      })

      // Log the mentor change event
      await tx.log.create({
        data: {
          entityType: "student",
          entityId: student.id,
          action: "mentor_changed",
          description: `Changed mentor for ${student.name} from ${student.studentAssignments[0]?.mentor?.name || "none"} to ${newMentor.name}`,
          userId: adminUserId,
          studentId: student.id,
          metadata: {
            previousMentorId: student.studentAssignments[0]?.mentor?.id || null,
            previousMentorName: student.studentAssignments[0]?.mentor?.name || null,
            newMentorId,
            newMentorName: newMentor.name,
            startDate
          }
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: `Successfully changed mentor for ${student.name} to ${newMentor.name}`
    })
  } catch (error: any) {
    console.error("Error changing mentor:", error)

    // Prisma Unique Constraint (P2002) hatasını yakalıyoruz
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "Bu öğrenci zaten seçilen tarihte bu mentora atanmış. Lütfen farklı bir tarih veya mentor seçin." },
        { status: 400 } // 500 yerine 400 (Bad Request) dönüyoruz
      )
    }

    return NextResponse.json(
      { error: "Mentor değişikliği sırasında bir hata oluştu." }, 
      { status: 500 }
    )
  }
}