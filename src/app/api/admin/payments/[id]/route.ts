import { NextRequest, NextResponse } from "next/server"
import { prisma, getAdminUserId } from "@/lib/prisma"

// Next.js 15 için tip tanımı
type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // 1. ADIM: Params'ı await ediyoruz
    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id: id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            school: true,
            grade: true,
            status: true,
            paymentStatus: true
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
      }
    })

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error("Error fetching payment:", error)
    return NextResponse.json({ error: "Failed to fetch payment" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // 1. ADIM: Params'ı await ediyoruz
    const { id } = await params;

    const body = await request.json()
    const { amount, weeks, status, notes } = body

    // Get current payment for comparison
    const currentPayment = await prisma.payment.findUnique({
      where: { id: id },
      include: {
        student: {
          select: {
            id: true,
            name: true
          }
        },
        mentor: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!currentPayment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (weeks !== undefined) updateData.weeks = parseInt(weeks)
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes

    // Update payment
    const payment = await prisma.payment.update({
      where: { id: id },
      data: updateData,
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

    // Log the update
    try {
      const adminUserId = await getAdminUserId()
      await prisma.log.create({
        data: {
          entityType: "payment",
          entityId: payment.id,
          action: status === "refunded" ? "refunded" : "updated",
          description: `Payment for ${currentPayment.student.name} to ${currentPayment.mentor.name} ${
            status === "refunded" ? "refunded" : "updated"
          }`,
          userId: adminUserId,
          studentId: payment.studentId,
          metadata: {
            previous: {
              amount: currentPayment.amount,
              status: currentPayment.status
            },
            updated: updateData
          }
        }
      })
    } catch (logError) {
      console.error("Warning: Failed to create log:", logError)
    }

    return NextResponse.json({ success: true, payment })
  } catch (error) {
    console.error("Error updating payment:", error)
    return NextResponse.json({ 
      error: "Failed to update payment", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // 1. ADIM: Params'ı await ediyoruz
    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id: id },
      include: {
        student: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // Delete payment
    await prisma.payment.delete({
      where: { id: id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting payment:", error)
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 })
  }
}