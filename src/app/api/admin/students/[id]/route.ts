import { NextRequest, NextResponse } from "next/server"
import { prisma, getAdminUserId } from "@/lib/prisma"
import { finalizeMentorEarningForAssignment } from "@/lib/mentor-earnings"

// Tip tanımını buraya ekleyelim (Next.js 15 standartı)
type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // 1. ADIM: Params'ı await et
    const { id } = await params;

    const student = await prisma.student.findUnique({
      where: { id: id },
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
  { params }: RouteParams
) {
  try {
    // 1. ADIM: Params'ı await et
    const { id } = await params;

    console.log("[API] PATCH /api/admin/students/[id] - Updating student:", id)
    const body = await request.json()
    const { name, email, phone, school, grade, startDate, endDate, status, paymentStatus,
            parentName, parentPhone, currentNetScore, targetNetScore,
            specialNote, dropReason, refundStatus, mentorChangeNote,
            droppedMonth, searchDay, searchMonth, contactPreference,
            sendMessage, membershipType, discountCode, stripeId } = body

    // Get current student for comparison
    const currentStudent = await prisma.student.findUnique({
      where: { id: id }
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
    // Yeni alanlar
    if (parentName !== undefined) updateData.parentName = parentName || null
    if (parentPhone !== undefined) updateData.parentPhone = parentPhone || null
    if (currentNetScore !== undefined) updateData.currentNetScore = currentNetScore || null
    if (targetNetScore !== undefined) updateData.targetNetScore = targetNetScore || null
    if (specialNote !== undefined) updateData.specialNote = specialNote || null
    if (dropReason !== undefined) updateData.dropReason = dropReason || null
    if (refundStatus !== undefined) updateData.refundStatus = refundStatus || null
    if (mentorChangeNote !== undefined) updateData.mentorChangeNote = mentorChangeNote || null
    if (droppedMonth !== undefined) updateData.droppedMonth = droppedMonth || null
    if (searchDay !== undefined) updateData.searchDay = searchDay || null
    if (searchMonth !== undefined) updateData.searchMonth = searchMonth || null
    if (contactPreference !== undefined) updateData.contactPreference = contactPreference || null
    if (sendMessage !== undefined) updateData.sendMessage = sendMessage
    if (membershipType !== undefined) updateData.membershipType = membershipType || null
    if (discountCode !== undefined) updateData.discountCode = discountCode || null
    if (stripeId !== undefined) updateData.stripeId = stripeId || null

    // Update student
    const student = await prisma.student.update({
      where: { id: id },
      data: updateData
    })

    // Ogrenci birakma veya iade durumunda mentor hakedislerini otomatik hesapla
    if (updateData.status === "dropped" || updateData.status === "refunded") {
      const activeAssignments = await prisma.studentAssignment.findMany({
        where: { studentId: id, endDate: null }
      })

      if (activeAssignments.length > 0) {
        const dropDate = new Date()
        const adminId = await getAdminUserId()
        const triggerReason = updateData.status === "dropped" ? "student_drop" : "student_refund"

        await prisma.$transaction(async (tx) => {
          for (const assignment of activeAssignments) {
            // Atamayi sonlandir
            await tx.studentAssignment.update({
              where: { id: assignment.id },
              data: { endDate: dropDate }
            })

            // Mentor hakedisini hesapla ve kaydet
            await finalizeMentorEarningForAssignment(
              tx,
              assignment.id,
              assignment.mentorId,
              id,
              assignment.startDate,
              dropDate,
              triggerReason,
              adminId,
              currentStudent.purchaseDate ?? currentStudent.startDate
            )
          }

          // Ogrenci bitis tarihini guncelle
          await tx.student.update({
            where: { id },
            data: { endDate: dropDate }
          })
        })
      }
    }

    // Log the update
    try {
      const adminUserId = await getAdminUserId()
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
    } catch (logError) {
      console.error("[API] Warning: Failed to create log:", logError)
    }

    return NextResponse.json({ success: true, student })
  } catch (error) {
    console.error("[API] Error updating student:", error)
    return NextResponse.json({ error: "Failed to update student", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // 1. ADIM: Params'ı await et
    const { id } = await params;

    const student = await prisma.student.findUnique({
      where: { id: id }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    await prisma.student.delete({
      where: { id: id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting student:", error)
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 })
  }
}