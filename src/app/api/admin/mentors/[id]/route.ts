import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const { id } = await params;
    // First get the mentor to find userId
    const mentor = await prisma.mentor.findUnique({
      where: { id: id }
    })

    if (!mentor) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 })
    }

    // Delete mentor (this will cascade delete related data)
    await prisma.mentor.delete({
      where: { id: id }
    })

    // Delete the associated user
    await prisma.user.delete({
      where: { id: mentor.userId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting mentor:", error)
    return NextResponse.json({ error: "Failed to delete mentor" }, { status: 500 })
  }
}