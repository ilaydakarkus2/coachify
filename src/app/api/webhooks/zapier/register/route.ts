import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/webhook-auth"
import { prisma, getAdminUserId } from "@/lib/prisma"
import { createLog } from "@/lib/audit"
import { isSheetsEnabled, appendStudentRow } from "@/lib/google-sheets"

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log("[REGISTER] === Yeni webhook request basladi ===")
  console.log("[REGISTER] URL:", request.url)
  console.log("[REGISTER] Method:", request.method)
  console.log("[REGISTER] Headers:", JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2))

  // API key dogrulama
  const auth = validateApiKey(request)
  if (!auth.valid) {
    console.error("[REGISTER] AUTH BASARISIZ - Sebep:", auth.error)
    return NextResponse.json(
      { success: false, message: auth.error },
      { status: 401 }
    )
  }
  console.log("[REGISTER] Auth basarili")

  let body: any
  try {
    body = await request.json()
    console.log("[REGISTER] Gelen body:", JSON.stringify(body, null, 2))
  } catch (parseError) {
    console.error("[REGISTER] JSON parse hatasi:", parseError)
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    )
  }

  // Gelen body'nin tum alanlarini logla
  const bodyKeys = Object.keys(body || {})
  console.log("[REGISTER] Body keys:", bodyKeys.join(", "))
  console.log("[REGISTER] Body alan detaylari:")
  for (const key of bodyKeys) {
    console.log(`  - ${key}: "${body[key]}" (${typeof body[key]})`)
  }

  // Zorunlu alan kontrolu - sadece name ve phone zorunlu (Tally'den gelenler)
  if (!body.name) {
    console.error("[REGISTER] EKSIK ALAN: 'name' bulunamadi. Gelen keys:", bodyKeys.join(", "))
    return NextResponse.json(
      { success: false, message: "Missing required field: name", receivedFields: bodyKeys },
      { status: 400 }
    )
  }

  // Email: verilmediyse studentNumber@coachify.local olustur
  const studentEmail = body.email || (body.studentNumber ? `${body.studentNumber}@coachify.local` : null)
  if (!studentEmail) {
    console.error("[REGISTER] EKSIK ALAN: 'email' ve 'studentNumber' ikisi de bos. name:", body.name)
    return NextResponse.json(
      { success: false, message: "Missing required: email or studentNumber", receivedFields: bodyKeys },
      { status: 400 }
    )
  }
  console.log("[REGISTER] Kullanilacak email:", studentEmail)

  // Duplicate ogrenci kontrolu - email
  console.log("[REGISTER] Duplicate kontrolu yapiliyor...")
  const existing = await prisma.student.findUnique({
    where: { email: studentEmail },
  })
  if (existing) {
    console.error("[REGISTER] DUPLICATE: Bu email zaten kayitli. studentId:", existing.id, "name:", existing.name)
    return NextResponse.json(
      { success: false, message: "Student already exists (email)", data: { studentId: existing.id, name: existing.name, email: studentEmail } },
      { status: 409 }
    )
  }

  // Duplicate ogrenci kontrolu - studentNumber
  if (body.studentNumber) {
    const studentNum = parseInt(body.studentNumber, 10)
    if (!isNaN(studentNum)) {
      const existingByNumber = await prisma.student.findUnique({
        where: { studentNumber: studentNum },
      })
      if (existingByNumber) {
        console.error("[REGISTER] DUPLICATE: Bu studentNumber zaten kayitli. studentId:", existingByNumber.id, "name:", existingByNumber.name, "studentNumber:", studentNum)
        return NextResponse.json(
          { success: false, message: "Student already exists (studentNumber)", data: { studentId: existingByNumber.id, name: existingByNumber.name, studentNumber: studentNum } },
          { status: 409 }
        )
      }
    }
  }
  console.log("[REGISTER] Duplicate kontrolu gecti, yeni kayit")

  // Mentor bul - email veya isim ile
  console.log("[REGISTER] Mentor araniyor - mentorEmail:", body.mentorEmail || "yok", "mentorName:", body.mentorName || "yok")
  let mentor = null
  if (body.mentorEmail) {
    mentor = await prisma.mentor.findFirst({ where: { email: body.mentorEmail } })
    console.log("[REGISTER] Email ile mentor arama sonucu:", mentor ? `Bulundu: ${mentor.name} (${mentor.id})` : "Bulunamadi")
  }
  if (!mentor && body.mentorName) {
    mentor = await prisma.mentor.findFirst({
      where: { name: { equals: body.mentorName, mode: "insensitive" } },
    })
    console.log("[REGISTER] Isim ile mentor arama sonucu:", mentor ? `Bulundu: ${mentor.name} (${mentor.id})` : "Bulunamadi")
  }
  if (!mentor) {
    const search = body.mentorEmail || body.mentorName || "none"
    console.error("[REGISTER] MENTOR BULUNAMADI - Aranan:", search)
    return NextResponse.json(
      { success: false, message: `Mentor not found: ${search}` },
      { status: 404 }
    )
  }
  console.log("[REGISTER] Mentor belirlendi:", mentor.name, "(", mentor.id, ")")

  const adminUserId = await getAdminUserId()
  console.log("[REGISTER] Admin userId:", adminUserId)

  try {
    console.log("[REGISTER] Transaction basliyor...")
    const result = await prisma.$transaction(async (tx) => {
      const startDate = body.startDate ? new Date(body.startDate) : new Date()
      console.log("[REGISTER] StartDate:", startDate.toISOString())

      // EndDate hesaplama - uyelik turune gore
      let endDate: Date | null = null
      const membershipType = body.membershipType || "1_aylik"

      if (membershipType === "1_aylik") {
        // 4 hafta = 28 gun
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 28)
        console.log("[REGISTER] EndDate hesaplandi (4 hafta):", endDate.toISOString())
      } else if (membershipType === "yks_kadar") {
        // YKS 2026: 14-15 Haziran 2026 -> 15 Haziran 2026 olarak set et
        endDate = new Date("2026-06-15")
        console.log("[REGISTER] EndDate hesaplandi (YKS):", endDate.toISOString())
      }
      // Diger durumlarda endDate null kalir

      // Student olustur
      console.log("[REGISTER] Student olusturuluyor - name:", body.name, "email:", studentEmail)
      const student = await tx.student.create({
        data: {
          name: body.name,
          email: studentEmail,
          studentNumber: body.studentNumber ? parseInt(body.studentNumber, 10) : null,
          phone: body.phone || "",
          school: body.school || "Belirtilmedi",
          grade: body.grade || "",
          startDate,
          endDate,
          status: "active",
          paymentStatus: "pending",
          packageDuration: body.packageDuration || 4,
          purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
          membershipStartDate: body.membershipStartDate
            ? new Date(body.membershipStartDate)
            : startDate,
          // Veli bilgileri
          parentName: body.parentName || null,
          parentPhone: body.parentPhone || null,
          // Puan takibi
          currentNetScore: body.currentNetScore || null,
          targetNetScore: body.targetNetScore || null,
          // Takip ve notlar
          specialNote: body.specialNote || null,
          // Tally formu
          membershipType: body.membershipType || "new",
          discountCode: body.discountCode || null,
          // Stripe
          stripeId: body.stripeId || null,
          // İletişim tercihi
          contactPreference: body.contactPreference || null,
          // Mesaj
          sendMessage: body.sendMessage || false,
          // Hesaplamalar
          daySAG: body.purchaseDate ? new Date(body.purchaseDate).getDate() : new Date().getDate(),
          dayUBG: startDate.getDate(),
          monthUBG: startDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
          monthBSO: body.membershipStartDate
            ? new Date(body.membershipStartDate).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })
            : startDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
        },
      })

      console.log("[REGISTER] Student olusturuldu - ID:", student.id)

      // Assignment olustur
      console.log("[REGISTER] Assignment olusturuluyor - student:", student.id, "mentor:", mentor.id)
      const assignment = await tx.studentAssignment.create({
        data: {
          studentId: student.id,
          mentorId: mentor.id,
          startDate,
        },
      })

      console.log("[REGISTER] Assignment olusturuldu - ID:", assignment.id)

      // Audit log - student
      console.log("[REGISTER] Audit loglar yaziliyor...")
      await createLog({
        entityType: "student",
        entityId: student.id,
        action: "created",
        description: `Zapier webhook: yeni öğrenci kaydı - ${student.name}`,
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

    console.log("[REGISTER] Transaction basariyla tamamlandi!")
    console.log("[REGISTER] Student:", result.student.name, "(", result.student.id, ")")
    console.log("[REGISTER] Assignment ID:", result.assignment.id)

    // Google Sheets sync (fire-and-forget)
    if (isSheetsEnabled()) {
      console.log("[REGISTER] Google Sheets sync basliyor...")
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
          parentName: result.student.parentName || undefined,
          parentPhone: result.student.parentPhone || undefined,
          currentNetScore: result.student.currentNetScore,
          targetNetScore: result.student.targetNetScore,
          specialNote: result.student.specialNote || undefined,
          membershipType: result.student.membershipType || undefined,
          discountCode: result.student.discountCode || undefined,
          stripeId: result.student.stripeId || undefined,
          contactPreference: result.student.contactPreference || undefined,
          sendMessage: result.student.sendMessage,
        })
        console.log("[REGISTER] Google Sheets sync basarili")
      } catch (sheetsError) {
        console.error("[SHEETS] Failed to append student row:", sheetsError)
      }
    } else {
      console.log("[REGISTER] Google Sheets sync devre disi (GOOGLE_SHEETS_ENABLED=false)")
    }

    const duration = Date.now() - startTime
    console.log(`[REGISTER] === BASARILI === Toplam sure: ${duration}ms`)
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
    const duration = Date.now() - startTime
    console.error(`[REGISTER] === HATA === Transaction basarisiz (${duration}ms)`)
    console.error("[REGISTER] Hata kodu:", error.code || "yok")
    console.error("[REGISTER] Hata mesaji:", error.message)
    console.error("[REGISTER] Hata detayi:", error.meta || "yok")
    console.error("[REGISTER] Full error:", error)

    // Prisma unique constraint hatasi
    if (error.code === "P2002") {
      console.error("[REGISTER] Prisma unique constraint hatasi - zaten mevcut kayit")
      return NextResponse.json(
        { success: false, message: "Student already exists (race condition)" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    )
  }
}
