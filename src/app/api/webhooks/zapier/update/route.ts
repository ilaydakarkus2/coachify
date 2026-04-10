import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/webhook-auth"
import { prisma, getAdminUserId } from "@/lib/prisma"
import { createLog } from "@/lib/audit"

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log("[UPDATE] === Webhook request basladi ===")

  // API key dogrulama
  const auth = validateApiKey(request)
  if (!auth.valid) {
    console.error("[UPDATE] AUTH BASARISIZ:", auth.error)
    return NextResponse.json({ success: false, message: auth.error }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
    console.log("[UPDATE] Gelen body:", JSON.stringify(body, null, 2))
  } catch (parseError) {
    console.error("[UPDATE] JSON parse hatasi:", parseError)
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 })
  }

  // Zorunlu: studentNumber
  if (!body.studentNumber) {
    console.error("[UPDATE] EKSIK: studentNumber")
    return NextResponse.json({ success: false, message: "Missing required field: studentNumber" }, { status: 400 })
  }

  const studentNum = parseInt(body.studentNumber, 10)
  if (isNaN(studentNum)) {
    console.error("[UPDATE] HATALI: studentNumber integer degil:", body.studentNumber)
    return NextResponse.json({ success: false, message: "studentNumber must be an integer" }, { status: 400 })
  }

  // Zorunlu: startDate veya endDate en az biri olmali
  if (!body.startDate && !body.endDate) {
    console.error("[UPDATE] EKSIK: startDate ve endDate ikisi de bos")
    return NextResponse.json(
      { success: false, message: "At least one of startDate or endDate is required" },
      { status: 400 }
    )
  }

  // Ogrenciyi bul
  console.log("[UPDATE] Ogrenci araniyor - studentNumber:", studentNum)
  const student = await prisma.student.findUnique({
    where: { studentNumber: studentNum },
  })

  if (!student) {
    console.error("[UPDATE] OGRENCI BULUNAMADI - studentNumber:", studentNum)
    return NextResponse.json(
      { success: false, message: `Student not found: ${studentNum}` },
      { status: 404 }
    )
  }
  console.log("[UPDATE] Ogrenci bulundu:", student.name, "- mevcut startDate:", student.startDate, "endDate:", student.endDate)

  // Guncellenecek veriyi hazirla
  const updateData: any = {}
  if (body.startDate) {
    updateData.startDate = new Date(body.startDate)
  }
  if (body.endDate !== undefined) {
    updateData.endDate = body.endDate ? new Date(body.endDate) : null
  }

  try {
    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: updateData,
    })

    const duration = Date.now() - startTime

    // Audit log
    const adminUserId = await getAdminUserId()
    await createLog({
      entityType: "student",
      entityId: student.id,
      action: "updated",
      description: `Zapier webhook: tarih güncelleme - ${student.name}`,
      userId: adminUserId,
      studentId: student.id,
      metadata: {
        source: "zapier_webhook",
        flow: "update",
        studentNumber: studentNum,
        previousStartDate: student.startDate.toISOString(),
        previousEndDate: student.endDate?.toISOString() || null,
        newStartDate: updatedStudent.startDate.toISOString(),
        newEndDate: updatedStudent.endDate?.toISOString() || null,
      },
    })

    console.log(`[UPDATE] BASARILI - ${updatedStudent.name} | startDate: ${updatedStudent.startDate.toISOString()} | endDate: ${updatedStudent.endDate?.toISOString() || "null"} | ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: "Student dates updated",
      data: {
        studentId: updatedStudent.id,
        studentNumber: studentNum,
        name: updatedStudent.name,
        startDate: updatedStudent.startDate.toISOString().split("T")[0],
        endDate: updatedStudent.endDate?.toISOString().split("T")[0] || null,
      },
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`[UPDATE] HATA - ${duration}ms`)
    console.error("[UPDATE] Error:", error.message)
    console.error("[UPDATE] Code:", error.code || "yok")
    console.error("[UPDATE] Meta:", error.meta || "yok")

    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    )
  }
}
