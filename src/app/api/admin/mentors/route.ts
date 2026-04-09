import { NextRequest, NextResponse } from "next/server"
import { prisma, getAdminUserId } from "@/lib/prisma"

export async function GET() {
  try {
    const mentors = await prisma.mentor.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            password: true // Show password for admin visibility
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json(mentors)
  } catch (error) {
    console.error("Error fetching mentors:", error)
    return NextResponse.json({ error: "Failed to fetch mentors" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, specialty } = body

    if (!name || !email || !password || !specialty) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    // Create user first (mentor role)
    const user = await prisma.user.create({
      data: {
        email,
        password, // Plain text as requested
        name,
        role: "mentor"
      }
    })

    // Create mentor profile linked to user
    const mentor = await prisma.mentor.create({
      data: {
        userId: user.id,
        name,
        email,
        specialty
      }
    })

    // Log
    try {
      const adminUserId = await getAdminUserId()
      await prisma.log.create({
        data: {
          entityType: "mentor",
          entityId: mentor.id,
          action: "created",
          description: `Yeni mentor oluşturuldu: ${name}`,
          userId: adminUserId,
          metadata: { name, email, specialty }
        }
      })
    } catch (logError) {
      console.error("[API] Warning: Failed to create log:", logError)
    }

    return NextResponse.json({ user, mentor }, { status: 201 })
  } catch (error) {
    console.error("Error creating mentor:", error)
    return NextResponse.json({ error: "Failed to create mentor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing mentor id" }, { status: 400 })
    }

    const mentor = await prisma.mentor.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } } }
    })

    if (!mentor) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 })
    }

    await prisma.mentor.delete({ where: { id } })

    // Log
    try {
      const adminUserId = await getAdminUserId()
      await prisma.log.create({
        data: {
          entityType: "mentor",
          entityId: id,
          action: "deleted",
          description: `Mentor silindi: ${mentor.name}`,
          userId: adminUserId,
          metadata: { name: mentor.name, email: mentor.email }
        }
      })
    } catch (logError) {
      console.error("[API] Warning: Failed to create log:", logError)
    }
  } catch (error) {
    console.error("Error creating mentor:", error)
    return NextResponse.json({ error: "Failed to create mentor" }, { status: 500 })
  }
}