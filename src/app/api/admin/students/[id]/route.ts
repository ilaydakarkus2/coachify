import { NextRequest, NextResponse } from "next/server"
import { prisma, getAdminUserId } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: params.id },
      include: {
        studentAssignments: {
          include: {
            mentor: {
              select: {
                id: true,
                name: true,
                email: true,
                specialty: true
              }
            }
          },
          orderBy: { startDate: "desc" }
        },
        payments: {
          include: {
            mentor: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { paymentDate: "desc" }
        },
        logs: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json(student)
  } catch (error) {
    console.error("Error fetching student:", error)
    return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("[API] PATCH /api/admin/students/[id] - Updating student:", params.id)
    const body = await request.json()
    const { name, email, phone, school, grade, startDate, endDate, status, paymentStatus } = body

    console.log("[API] Update data:", { name, email, phone, school, grade, startDate, endDate, status, paymentStatus })

    // Get current student for comparison
    const currentStudent = await prisma.student.findUnique({
      where: { id: params.id }
    })

    if (!currentStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (phone) updateData.phone = phone
    if (school) updateData.school = school
    if (grade) updateData.grade = grade
    if (startDate) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (status) updateData.status = status
    if (paymentStatus) updateData.paymentStatus = paymentStatus

    // Update student
    const student = await prisma.student.update({
      where: { id: params.id },
      data: updateData
    })

    // Log the update
    try {
      const adminUserId = await getAdminUserId()
      console.log("[API] Admin user ID for logging:", adminUserId)

      await prisma.log.create({
        data: {
          entityType: "student",
          entityId: student.id,
          action: "updated",
          description: `Student ${student.name} updated`,
          userId: adminUserId,
          studentId: student.id,
          metadata: {
            previous: {
              status: currentStudent.status,
              paymentStatus: currentStudent.paymentStatus
            },
            updated: updateData
          }
        }
      })
      console.log("[API] Log created successfully")
    } catch (logError) {
      console.error("[API] Warning: Failed to create log:", logError)
      // Don't fail the whole operation if logging fails
    }

    console.log("[API] Student updated successfully:", student)
    return NextResponse.json({ success: true, student })
  } catch (error) {
    console.error("[API] Error updating student:", error)
    console.error("[API] Error details:", JSON.stringify(error, null, 2))
    return NextResponse.json({ error: "Failed to update student", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: params.id }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Delete student (this will cascade delete assignments, payments, and logs)
    await prisma.student.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting student:", error)
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 })
  }
}
