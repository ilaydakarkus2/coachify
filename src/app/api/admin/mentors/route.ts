import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

    return NextResponse.json({ user, mentor }, { status: 201 })
  } catch (error) {
    console.error("Error creating mentor:", error)
    return NextResponse.json({ error: "Failed to create mentor" }, { status: 500 })
  }
}