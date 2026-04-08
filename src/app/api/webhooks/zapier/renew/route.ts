import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/webhook-auth"
import { prisma, getAdminUserId } from "@/lib/prisma"
import { createLog } from "@/lib/audit"
import { finalizeMentorEarningForAssignment } from "@/lib/mentor-earnings"
import { isSheetsEnabled, updateStudentRow } from "@/lib/google-sheets"

export async function POST(request: NextRequest) {
  // API key dogrulama
  const auth = validateApiKey(request)
  if (!auth.valid) {
    return NextResponse.json(
      { success: false, message: auth.error },
      { status: 401 }
    )
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    )
  }

  // Zorunlu alan kontrolu
  if (!body.email || !body.newStartDate) {
    return NextResponse.json(
      { success: false, message: "Missing required fields: email, newStartDate" },
      { status: 400 }
    )
  }

  // Ogrenciyi bul (aktif assignment'lari dahil)
  const student = await prisma.student.findUnique({
    where: { email: body.email },
    include: {
      studentAssignments: {
        where: { endDate: null },
        include: { mentor: true },
      },
    },
  })

  if (!student) {
    return NextResponse.json(
      { success: false, message: `Student not found: ${body.email}` },
      { status: 404 }
    )
  }

  // Mentor cozumle: verildiyse yeni mentor, verilmemirse mevcut
  let mentor = student.studentAssignments[0]?.mentor || null

  if (body.mentorEmail) {
    const newMentor = await prisma.mentor.findUnique({
      where: { email: body.mentorEmail },
    })
    if (!newMentor) {
      return NextResponse.json(
        { success: false, message: `Mentor not found: ${body.mentorEmail}` },
        { status: 404 }
      )
    }
    mentor = newMentor
  }

  if (!mentor) {
    return NextResponse.json(
      { success: false, message: "No mentor found for student" },
      { status: 400 }
    )
  }

  const adminUserId = await getAdminUserId()
  const newStartDate = new Date(body.newStartDate)
  const previousStartDate = student.startDate

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Mevcut aktif assignment'lari sonuclandir
      for (const assignment of student.studentAssignments) {
        await tx.studentAssignment.update({
          where: { id: assignment.id },
          data: { endDate: newStartDate },
        })

        // Hakedis sonuclandirma
        await finalizeMentorEarningForAssignment(
          tx,
          assignment.id,
          assignment.mentorId,
          student.id,
          assignment.startDate,
          newStartDate,
          "periodic_calc",
          adminUserId,
          student.startDate
        )
      }

      // Student guncelle
      const updatedStudent = await tx.student.update({
        where: { id: student.id },
        data: {
          startDate: newStartDate,
          endDate: null,
          status: "active",
          paymentStatus: "pending",
          packageDuration: body.newPackageDuration || student.packageDuration,
          membershipStartDate: newStartDate,
          purchaseDate: body.renewalDate ? new Date(body.renewalDate) : new Date(),
        },
      })

      // Yeni assignment olustur
      const newAssignment = await tx.studentAssignment.create({
        data: {
          studentId: student.id,
          mentorId: mentor!.id,
          startDate: newStartDate,
        },
      })

      // Audit log
      await createLog({
        entityType: "student",
        entityId: student.id,
        action: "updated",
        description: `Zapier webhook: uyelik yenileme - ${student.name}`,
        userId: adminUserId,
        studentId: student.id,
        metadata: {
          source: "zapier_webhook",
          flow: "renew",
          previousStartDate: previousStartDate.toISOString(),
          newStartDate: newStartDate.toISOString(),
          mentorId: mentor!.id,
          mentorName: mentor!.name,
        },
      })

      return { student: updatedStudent, assignment: newAssignment }
    })

    // Google Sheets sync (fire-and-forget)
    if (isSheetsEnabled()) {
      try {
        await updateStudentRow(student.email, {
          startDate: newStartDate.toISOString().split("T")[0],
          status: "active",
          membershipStartDate: newStartDate.toISOString().split("T")[0],
          packageDuration: body.newPackageDuration || student.packageDuration,
          mentor: mentor.name,
        })
      } catch (sheetsError) {
        console.error("[SHEETS] Failed to update student row:", sheetsError)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Membership renewed successfully",
      data: {
        studentId: result.student.id,
        name: result.student.name,
        email: result.student.email,
        newStartDate: newStartDate.toISOString().split("T")[0],
        mentorName: mentor.name,
      },
    })
  } catch (error) {
    console.error("[WEBHOOK] Renew error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
