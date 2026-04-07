import { NextRequest, NextResponse } from "next/server"
import { prisma, getAdminUserId } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const mentorId = searchParams.get("mentorId")
    const status = searchParams.get("status") // "active" or "ended"

    const assignments = await prisma.studentAssignment.findMany({
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            school: true,
            grade: true,
            status: true
          }
        },
        mentor: {
          select: {
            id: true,
            name: true,
            email: true,
            specialty: true
          }
        }
      },
      where: {
        ...(studentId && { studentId }),
        ...(mentorId && { mentorId }),
        ...(status === "active" && { endDate: null }),
        ...(status === "ended" && { endDate: { not: null } })
      },
      orderBy: { startDate: "desc" }
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error("Error fetching assignments:", error)
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, mentorId, startDate, notes } = body

    if (!studentId || !mentorId || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    })

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      )
    }

    // Check if mentor exists
    const mentor = await prisma.mentor.findUnique({
      where: { id: mentorId }
    })

    if (!mentor) {
      return NextResponse.json(
        { error: "Mentor not found" },
        { status: 404 }
      )
    }

    // End any active assignments for this student
    await prisma.studentAssignment.updateMany({
      where: {
        studentId,
        endDate: null
      },
      data: {
        endDate: new Date()
      }
    })

    // Create new assignment
    const assignment = await prisma.studentAssignment.create({
      data: {
        studentId,
        mentorId,
        startDate: new Date(startDate),
        notes: notes || null
      },
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

    // Log the assignment change
    try {
      const adminUserId = await getAdminUserId()
      await prisma.log.create({
        data: {
          entityType: "assignment",
          entityId: assignment.id,
          action: "created",
          description: `Student ${student.name} assigned to mentor ${mentor.name}`,
          userId: adminUserId,
          studentId: studentId,
          metadata: {
            mentorId,
            mentorName: mentor.name
          }
        }
      })
    } catch (logError) {
      console.error("Warning: Failed to create log:", logError)
    }

    return NextResponse.json({ success: true, assignment }, { status: 201 })
  } catch (error) {
    console.error("Error creating assignment:", error)
    return NextResponse.json({ error: "Failed to create assignment", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
