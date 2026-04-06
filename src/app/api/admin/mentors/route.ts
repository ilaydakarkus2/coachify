import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const mentors = await prisma.mentor.findMany({
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
    const { name, email, specialty } = body

    if (!name || !email || !specialty) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const mentor = await prisma.mentor.create({
      data: {
        name,
        email,
        specialty
      }
    })

    return NextResponse.json(mentor, { status: 201 })
  } catch (error) {
    console.error("Error creating mentor:", error)
    return NextResponse.json({ error: "Failed to create mentor" }, { status: 500 })
  }
}