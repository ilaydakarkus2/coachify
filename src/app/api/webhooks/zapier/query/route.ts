import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/webhook-auth"
import { prisma, getAdminUserId } from "@/lib/prisma"
import { createLog } from "@/lib/audit"

const VALID_QUERIES = ["expiring_soon", "by_email", "all_active"]

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

  if (!body.query || !VALID_QUERIES.includes(body.query)) {
    return NextResponse.json(
      {
        success: false,
        message: `Unknown query type. Supported: ${VALID_QUERIES.join(", ")}`,
      },
      { status: 400 }
    )
  }

  const filters = body.filters || {}
  const adminUserId = await getAdminUserId()

  try {
    let data: any[] = []

    switch (body.query) {
      case "expiring_soon": {
        const daysAhead = filters.daysAhead || 7
        const now = new Date()
        const futureDate = new Date(now)
        futureDate.setDate(futureDate.getDate() + daysAhead)

        const students = await prisma.student.findMany({
          where: {
            status: "active",
            endDate: { not: null, gte: now, lte: futureDate },
          },
          include: {
            studentAssignments: {
              where: { endDate: null },
              include: { mentor: true },
            },
          },
        })

        data = students.map((s) => {
          const currentMentor = s.studentAssignments[0]?.mentor
          const endDate = s.endDate!
          const daysUntilExpiry = Math.ceil(
            (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
          return {
            name: s.name,
            email: s.email,
            phone: s.phone,
            school: s.school,
            grade: s.grade,
            status: s.status,
            startDate: s.startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
            daysUntilExpiry,
            currentMentor: currentMentor?.name || null,
            mentorEmail: currentMentor?.email || null,
            packageDuration: s.packageDuration,
            parentName: s.parentName,
            parentPhone: s.parentPhone,
            contactPreference: s.contactPreference,
            sendMessage: s.sendMessage,
            membershipType: s.membershipType,
            specialNote: s.specialNote,
          }
        })
        break
      }

      case "by_email": {
        const emails: string[] = filters.emails || []
        if (emails.length === 0) {
          return NextResponse.json(
            { success: false, message: "Missing filters.emails" },
            { status: 400 }
          )
        }

        const students = await prisma.student.findMany({
          where: { email: { in: emails } },
          include: {
            studentAssignments: {
              where: { endDate: null },
              include: { mentor: true },
            },
          },
        })

        data = students.map((s) => {
          const currentMentor = s.studentAssignments[0]?.mentor
          return {
            name: s.name,
            email: s.email,
            phone: s.phone,
            school: s.school,
            grade: s.grade,
            status: s.status,
            startDate: s.startDate.toISOString().split("T")[0],
            endDate: s.endDate?.toISOString().split("T")[0] || null,
            currentMentor: currentMentor?.name || null,
            mentorEmail: currentMentor?.email || null,
            packageDuration: s.packageDuration,
            parentName: s.parentName,
            parentPhone: s.parentPhone,
            contactPreference: s.contactPreference,
            sendMessage: s.sendMessage,
            membershipType: s.membershipType,
            specialNote: s.specialNote,
          }
        })
        break
      }

      case "all_active": {
        const limit = filters.limit || 100
        const offset = filters.offset || 0

        const students = await prisma.student.findMany({
          where: { status: "active" },
          include: {
            studentAssignments: {
              where: { endDate: null },
              include: { mentor: true },
            },
          },
          take: limit,
          skip: offset,
          orderBy: { createdAt: "desc" },
        })

        data = students.map((s) => {
          const currentMentor = s.studentAssignments[0]?.mentor
          return {
            name: s.name,
            email: s.email,
            phone: s.phone,
            school: s.school,
            grade: s.grade,
            status: s.status,
            startDate: s.startDate.toISOString().split("T")[0],
            endDate: s.endDate?.toISOString().split("T")[0] || null,
            currentMentor: currentMentor?.name || null,
            mentorEmail: currentMentor?.email || null,
            packageDuration: s.packageDuration,
            parentName: s.parentName,
            parentPhone: s.parentPhone,
            contactPreference: s.contactPreference,
            sendMessage: s.sendMessage,
            membershipType: s.membershipType,
            specialNote: s.specialNote,
          }
        })
        break
      }
    }

    // Audit log
    await createLog({
      entityType: "student",
      entityId: "query",
      action: "queried",
      description: `Zapier webhook: CRM sorgu - ${body.query} (${data.length} results)`,
      userId: adminUserId,
      metadata: { source: "zapier_webhook", flow: "query", queryType: body.query, resultCount: data.length },
    })

    return NextResponse.json({
      success: true,
      query: body.query,
      count: data.length,
      data,
    })
  } catch (error) {
    console.error("[WEBHOOK] Query error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
