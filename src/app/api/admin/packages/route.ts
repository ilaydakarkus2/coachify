import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      include: {
        mentor: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json(packages)
  } catch (error) {
    console.error("Error fetching packages:", error)
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, price, duration, mentorId } = body

    if (!title || !price || !duration || !mentorId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const pkg = await prisma.package.create({
      data: {
        title,
        price: parseFloat(price),
        duration: parseInt(duration),
        mentorId
      },
      include: {
        mentor: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(pkg, { status: 201 })
  } catch (error) {
    console.error("Error creating package:", error)
    return NextResponse.json({ error: "Failed to create package" }, { status: 500 })
  }
}