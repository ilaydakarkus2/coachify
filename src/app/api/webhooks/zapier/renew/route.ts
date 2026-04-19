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

  // Ogrenciyi bul - email veya studentNumber ile
  const studentEmail = body.email || (body.studentNumber ? `${body.studentNumber}@coachify.local` : null)
  if (!studentEmail) {
    return NextResponse.json(
      { success: false, message: "Missing required: email or studentNumber" },
      { status: 400 }
    )
  }

  const student = await prisma.student.findUnique({
    where: { email: studentEmail },
    include: {
      studentAssignments: {
        where: { endDate: null },
        include: { mentor: true },
      },
    },
  })

  if (!student) {
    return NextResponse.json(
      { success: false, message: `Student not found: ${studentEmail}` },
      { status: 404 }
    )
  }

  // Mentor cozumle: verildiyse yeni mentor, verilmemirse mevcut
  let mentor = student.studentAssignments[0]?.mentor || null

  if (body.mentorEmail) {
    const newMentor = await prisma.mentor.findFirst({
      where: { email: body.mentorEmail },
    })
    if (!newMentor) {
      return NextResponse.json(
        { success: false, message: `Mentor not found: ${body.mentorEmail}` },
        { status: 404 }
      )
    }
    mentor = newMentor
  } else if (body.mentorName) {
    const newMentor = await prisma.mentor.findFirst({
      where: { name: { equals: body.mentorName, mode: "insensitive" } },
    })
    if (newMentor) {
      mentor = newMentor
    }
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
          "membership_renewal",
          adminUserId,
          student.purchaseDate ?? student.startDate
        )
      }

      // Yeni endDate hesapla (startDate + 1 ay) — UTC guvenli
      const newEndDate = new Date(Date.UTC(
        newStartDate.getUTCFullYear(),
        newStartDate.getUTCMonth() + 1,
        Math.min(newStartDate.getUTCDate(), new Date(Date.UTC(newStartDate.getUTCFullYear(), newStartDate.getUTCMonth() + 2, 0)).getUTCDate())
      ))

      // Student guncelle
      const updatedStudent = await tx.student.update({
        where: { id: student.id },
        data: {
          startDate: newStartDate,
          endDate: newEndDate,
          status: "active",
          paymentStatus: "paid",
          packageDuration: body.newPackageDuration || student.packageDuration,
          membershipStartDate: newStartDate,
          // purchaseDate (SAG) değişmez — yenileme sırasında sabit kalır
          // Yenileme bilgileri
          membershipType: "renewal",
          packageType: body.packageType || student.packageType || null,
          discountCode: body.discountCode || student.discountCode,
          stripeId: body.stripeId || student.stripeId,
          contactPreference: body.contactPreference || student.contactPreference,
          specialNote: body.specialNote || student.specialNote,
          // Hesaplamalar
          dayUBG: newStartDate.getDate(),
          monthUBG: newStartDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
          monthBSO: newStartDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
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
        description: `Zapier webhook: üyelik yenileme - ${student.name}`,
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
        await updateStudentRow(student.email || "", {
          startDate: newStartDate.toISOString().split("T")[0],
          status: "active",
          membershipStartDate: newStartDate.toISOString().split("T")[0],
          packageDuration: body.newPackageDuration || student.packageDuration,
          mentor: mentor.name,
          membershipType: "renewal",
          discountCode: body.discountCode || student.discountCode || undefined,
          stripeId: body.stripeId || student.stripeId || undefined,
          contactPreference: body.contactPreference || student.contactPreference || undefined,
          specialNote: body.specialNote || student.specialNote || undefined,
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
