import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const invoices = await prisma.invoice.findMany({
      where: { userId: session.user.id },
      include: {
        mentor: {
          select: {
            name: true
          }
        },
        package: {
          select: {
            title: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json(invoices)
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { mentorId, packageId, amount } = body

    if (!mentorId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const invoice = await prisma.invoice.create({
      data: {
        userId: session.user.id,
        mentorId,
        packageId: packageId || null,
        amount: parseFloat(amount),
        status: "pending"
      },
      include: {
        mentor: {
          select: {
            name: true
          }
        },
        package: {
          select: {
            title: true
          }
        }
      }
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error("Error creating invoice:", error)
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 })
  }
}