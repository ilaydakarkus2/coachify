import { NextRequest, NextResponse } from "next/server"
import { prisma, getAdminUserId } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { endDate, notes } = body

    // Get current assignment
    const currentAssignment = await prisma.studentAssignment.findUnique({
      where: { id: params.id },
      include: {
        student: {
          select: {
            id: true,
            name: true
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

    // Update assignment
    const assignment = await prisma.studentAssignment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        mentor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Log the update
    try {
      const adminUserId = await getAdminUserId()
      await prisma.log.create({
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
    } catch (logError) {
      console.error("Warning: Failed to create log:", logError)
    }

    return NextResponse.json({ success: true, assignment })
  } catch (error) {
    console.error("Error updating assignment:", error)
    return NextResponse.json({ error: "Failed to update assignment", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assignment = await prisma.studentAssignment.findUnique({
      where: { id: params.id },
      include: {
        student: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    // Delete assignment
    await prisma.studentAssignment.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting assignment:", error)
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 })
  }
}
