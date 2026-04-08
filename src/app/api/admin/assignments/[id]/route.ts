import { NextRequest, NextResponse } from "next/server"
import { prisma, getAdminUserId } from "@/lib/prisma"
import { finalizeMentorEarningForAssignment } from "@/lib/mentor-earnings"

// Tip tanımını buraya ekleyelim (Next.js 15 standartı)
type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // 1. ADIM: Params'ı await ile çözüyoruz
    const { id } = await params;

    const body = await request.json()
    const { endDate, notes } = body

    // 2. ADIM: Artık çözülmüş olan 'id'yi kullanıyoruz
    const currentAssignment = await prisma.studentAssignment.findUnique({
      where: { id: id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            purchaseDate: true,
            startDate: true
          }
        },
        mentor: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!currentAssignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (notes !== undefined) updateData.notes = notes

    const adminUserId = await getAdminUserId()

    // Eger endDate set ediliyorsa ve atama aktifse, earning finalize et
    const isEnding = updateData.endDate && !currentAssignment.endDate

    await prisma.$transaction(async (tx) => {
      const assignment = await tx.studentAssignment.update({
        where: { id: id },
        data: updateData,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              purchaseDate: true,
              startDate: true
            }
          },
          mentor: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      if (isEnding) {
        const sag = assignment.student.purchaseDate ?? assignment.student.startDate
        await finalizeMentorEarningForAssignment(
          tx,
          id,
          assignment.mentorId,
          assignment.studentId,
          currentAssignment.startDate,
          updateData.endDate,
          "assignment_end",
          adminUserId,
          sag
        )
      }

      // Log the update
      await tx.log.create({
        data: {
          entityType: "assignment",
          entityId: assignment.id,
          action: "updated",
          description: `Assignment for ${currentAssignment.student.name} with ${currentAssignment.mentor.name} updated`,
          userId: adminUserId,
          studentId: assignment.studentId,
          metadata: {
            previous: {
              endDate: currentAssignment.endDate
            },
            updated: updateData
          }
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating assignment:", error)
    return NextResponse.json({ 
      error: "Failed to update assignment", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const assignment = await prisma.studentAssignment.findUnique({
      where: { id: id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            purchaseDate: true,
            startDate: true
          }
        },
        mentor: {
          select: { id: true, name: true }
        }
      }
    })

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    const adminUserId = await getAdminUserId()
    const now = new Date()
    const sag = assignment.student.purchaseDate ?? assignment.student.startDate

    await prisma.$transaction(async (tx) => {
      // Atama icin pending earning kayitlarini iptal et
      await tx.mentorEarning.updateMany({
        where: {
          assignmentId: id,
          status: "pending"
        },
        data: { status: "cancelled" }
      })

      // Eger atama hala aktifse, finalize et (paid kayitlara dokunma)
      if (!assignment.endDate) {
        await finalizeMentorEarningForAssignment(
          tx,
          id,
          assignment.mentorId,
          assignment.studentId,
          assignment.startDate,
          now,
          "assignment_deleted",
          adminUserId,
          sag
        )
      }

      // Atamayi sil
      await tx.studentAssignment.delete({
        where: { id: id }
      })

      // Log
      await tx.log.create({
        data: {
          entityType: "assignment",
          entityId: id,
          action: "deleted",
          description: `Atama silindi: ${assignment.student.name} - ${assignment.mentor.name}`,
          userId: adminUserId,
          studentId: assignment.studentId,
          metadata: {
            mentorId: assignment.mentorId,
            mentorName: assignment.mentor.name,
            startDate: assignment.startDate.toISOString(),
            endDate: assignment.endDate?.toISOString() ?? null
          }
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting assignment:", error)
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 })
  }
}