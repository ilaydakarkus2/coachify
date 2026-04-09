import { NextRequest, NextResponse } from "next/server"
import { prisma, getAdminUserId } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, password, specialty } = body

    const mentor = await prisma.mentor.findUnique({ where: { id } })
    if (!mentor) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 })
    }

    // If email is changing, check for duplicates
    if (email && email !== mentor.email) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing && existing.id !== mentor.userId) {
        return NextResponse.json({ error: "Bu e-posta adresi başka bir kullanıcıya ait" }, { status: 400 })
      }
    }

    // Update mentor record
    const mentorUpdate: Record<string, string> = {}
    if (name) mentorUpdate.name = name
    if (email) mentorUpdate.email = email
    if (specialty) mentorUpdate.specialty = specialty

    await prisma.mentor.update({
      where: { id },
      data: mentorUpdate
    })

    // Update associated user record
    const userUpdate: Record<string, string> = {}
    if (name) userUpdate.name = name
    if (email) userUpdate.email = email
    if (password) userUpdate.password = password

    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.update({
        where: { id: mentor.userId },
        data: userUpdate
      })
    }

    // Log
    try {
      const adminUserId = await getAdminUserId()
      await prisma.log.create({
        data: {
          entityType: "mentor",
          entityId: id,
          action: "updated",
          description: `Mentor güncellendi: ${name || mentor.name}`,
          userId: adminUserId,
          metadata: { name, email, specialty }
        }
      })
    } catch (logError) {
      console.error("[API] Warning: Failed to create log:", logError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating mentor:", error)
    return NextResponse.json({ error: "Failed to update mentor" }, { status: 500 })
  }
}

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