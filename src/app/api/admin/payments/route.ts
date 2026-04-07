import { NextRequest, NextResponse } from "next/server"
import { prisma, getAdminUserId } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const mentorId = searchParams.get("mentorId")
    const status = searchParams.get("status")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const payments = await prisma.payment.findMany({
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
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      where: {
        ...(studentId && { studentId }),
        ...(mentorId && { mentorId }),
        ...(status && { status }),
        ...(startDate && { paymentDate: { gte: new Date(startDate) } }),
        ...(endDate && { paymentDate: { lte: new Date(endDate) } })
      },
      orderBy: { paymentDate: "desc" }
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error("Error fetching payments:", error)
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, mentorId, amount, weeks, status, notes } = body

    // İşlemi yapan adminin ID'sini alıyoruz
    const adminUserId = await getAdminUserId()

    // Gerekli alanların kontrolü (body'den gelmesi beklenenler)
    if (!studentId || !mentorId || !amount || !weeks) {
      console.log("[API] Missing fields:", { studentId, mentorId, adminUserId, amount, weeks });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Öğrenci kontrolü
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Mentor kontrolü
    const mentor = await prisma.mentor.findUnique({
      where: { id: mentorId }
    })

    if (!mentor) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 })
    }

    // Kullanıcı (Admin) kontrolü - adminUserId kullanarak yapıyoruz
    const user = await prisma.user.findUnique({
      where: { id: adminUserId }
    })

    if (!user) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 })
    }

    // Ödeme oluşturma
    const payment = await prisma.payment.create({
      data: {
        studentId,
        mentorId,
        userId: adminUserId, // Artık body'den gelen belirsiz userId yerine adminUserId kullanıyoruz
        amount: parseFloat(amount.toString()),
        weeks: parseInt(weeks.toString()),
        status: status || "pending",
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

    // Loglama
    try {
      await prisma.log.create({
        data: {
          entityType: "payment",
          entityId: payment.id,
          action: "created",
          description: `Payment of $${amount} created for ${student.name} to ${mentor.name}`,
          userId: adminUserId,
          studentId: studentId,
          metadata: {
            amount,
            weeks,
            status: payment.status,
            mentorId,
            mentorName: mentor.name
          }
        }
      })
    } catch (logError) {
      console.error("Warning: Failed to create log:", logError)
    }

    return NextResponse.json({ success: true, payment }, { status: 201 })
  } catch (error) {
    console.error("Error creating payment:", error)
    return NextResponse.json({ 
      error: "Failed to create payment", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}