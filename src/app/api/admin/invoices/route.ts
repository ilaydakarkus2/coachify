import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
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