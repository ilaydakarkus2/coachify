import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/webhook-auth"
import { prisma, getAdminUserId } from "@/lib/prisma"
import { createLog } from "@/lib/audit"
import { isSheetsEnabled, appendStudentRow } from "@/lib/google-sheets"

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
  const requiredFields = ["name", "email", "phone", "school", "grade", "startDate", "mentorEmail"]
  const missing = requiredFields.filter((f) => !body[f])
  if (missing.length > 0) {
    return NextResponse.json(
      { success: false, message: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    )
  }

  // Duplicate ogrenci kontrolu
  const existing = await prisma.student.findUnique({
    where: { email: body.email },
  })
  if (existing) {
    return NextResponse.json(
      { success: false, message: "Student already exists", data: { studentId: existing.id } },
      { status: 409 }
    )
  }

  // Mentor bul
  const mentor = await prisma.mentor.findUnique({
    where: { email: body.mentorEmail },
  })
  if (!mentor) {
    return NextResponse.json(
      { success: false, message: `Mentor not found: ${body.mentorEmail}` },
      { status: 404 }
    )
  }

  const adminUserId = await getAdminUserId()

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Student olustur
      const student = await tx.student.create({
        data: {
          name: body.name,
          email: body.email,
          phone: body.phone,
          school: body.school,
          grade: body.grade,
          startDate: new Date(body.startDate),
          status: "active",
          paymentStatus: "pending",
          packageDuration: body.packageDuration || 4,
          purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
          membershipStartDate: body.membershipStartDate
            ? new Date(body.membershipStartDate)
            : new Date(body.startDate),
        },
      })

      // Assignment olustur
      const assignment = await tx.studentAssignment.create({
        data: {
          studentId: student.id,
          mentorId: mentor.id,
          startDate: new Date(body.startDate),
        },
      })

      // Audit log - student
      await createLog({
        entityType: "student",
        entityId: student.id,
        action: "created",
        description: `Zapier webhook: yeni ogrenci kaydi - ${student.name}`,
        userId: adminUserId,
        studentId: student.id,
        metadata: { source: "zapier_webhook", flow: "register", email: student.email },
      })

      // Audit log - assignment
      await createLog({
        entityType: "assignment",
        entityId: assignment.id,
        action: "created",
        description: `Zapier webhook: ${mentor.name} mentor atandi - ${student.name}`,
        userId: adminUserId,
        studentId: student.id,
        metadata: { source: "zapier_webhook", flow: "register", mentorId: mentor.id },
      })

      return { student, assignment }
    })

    // Google Sheets sync (fire-and-forget)
    if (isSheetsEnabled()) {
      try {
        await appendStudentRow({
          name: result.student.name,
          email: result.student.email,
          phone: result.student.phone,
          school: result.student.school,
          grade: result.student.grade,
          startDate: result.student.startDate.toISOString().split("T")[0],
          packageDuration: result.student.packageDuration,
          mentor: mentor.name,
          status: result.student.status,
          membershipStartDate: result.student.membershipStartDate.toISOString().split("T")[0],
        })
      } catch (sheetsError) {
        console.error("[SHEETS] Failed to append student row:", sheetsError)
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Student registered successfully",
        data: {
          studentId: result.student.id,
          name: result.student.name,
          email: result.student.email,
          mentorId: mentor.id,
          mentorName: mentor.name,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("[WEBHOOK] Register error:", error)

    // Prisma unique constraint hatasi
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, message: "Student already exists (race condition)" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
