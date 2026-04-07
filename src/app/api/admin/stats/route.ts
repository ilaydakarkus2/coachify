import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface Stats {
  totalStudents: number
  activeStudents: number
  droppedStudents: number
  refundedStudents: number
  totalRevenue: number
  totalMentors: number
  currentMonthRevenue: number
  lastMonthRevenue: number
  revenueGrowth: number
  upcomingExpirations: Array<{
    id: string
    name: string
    email: string
    endDate: string
    daysLeft: number
    mentor: {
      id: string
      name: string
      email: string
    } | null
  }>
  mentorWorkload: Array<{
    mentor: {
      id: string
      name: string
      email: string
      specialty: string
    }
    activeStudents: number
  }>
}

export async function GET() {
  try {
    // Get student counts by status
    const studentCounts = await prisma.student.groupBy({
      by: ["status"],
      _count: {
        status: true
      }
    })

    const stats: Stats = {
      totalStudents: studentCounts.reduce((sum, group) => sum + group._count.status, 0),
      activeStudents: studentCounts.find(g => g.status === "active")?._count.status || 0,
      droppedStudents: studentCounts.find(g => g.status === "dropped")?._count.status || 0,
      refundedStudents: studentCounts.find(g => g.status === "refunded")?._count.status || 0,
      totalRevenue: 0,
      totalMentors: 0,
      currentMonthRevenue: 0,
      lastMonthRevenue: 0,
      revenueGrowth: 0,
      upcomingExpirations: [],
      mentorWorkload: []
    }

    // Get total revenue from paid payments
    const paidPayments = await prisma.payment.findMany({
      where: { status: "paid" }
    })

    stats.totalRevenue = paidPayments.reduce((sum, payment) => sum + payment.amount, 0)

    // Get total mentors
    const totalMentors = await prisma.mentor.count()
    stats.totalMentors = totalMentors

    // Get upcoming expirations (students with end dates in next 7 days)
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const upcomingExpirations = await prisma.student.findMany({
      where: {
        status: "active",
        endDate: {
          gte: now,
          lte: nextWeek
        }
      },
      include: {
        studentAssignments: {
          where: { endDate: null },
          include: {
            mentor: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { endDate: "asc" }
    })

    stats.upcomingExpirations = upcomingExpirations.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      endDate: student.endDate,
      daysLeft: Math.ceil((student.endDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      mentor: student.studentAssignments[0]?.mentor || null
    }))

    // Get mentor workload
    const mentorWorkload = await prisma.studentAssignment.groupBy({
      by: ["mentorId"],
      where: { endDate: null },
      _count: {
        mentorId: true
      }
    })

    const mentorDetails = await prisma.mentor.findMany({
      where: {
        id: { in: mentorWorkload.map(m => m.mentorId) }
      },
      select: {
        id: true,
        name: true,
        email: true,
        specialty: true
      }
    })

    stats.mentorWorkload = mentorWorkload.map((workload) => {
      const mentor = mentorDetails.find(m => m.id === workload.mentorId)
      return {
        mentor: mentor || { id: workload.mentorId, name: "Unknown", email: "", specialty: "" },
        activeStudents: workload._count.mentorId
      }
    }).sort((a, b) => b.activeStudents - a.activeStudents)

    // Get monthly revenue
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const currentMonthPayments = await prisma.payment.findMany({
      where: {
        status: "paid",
        paymentDate: {
          gte: currentMonthStart,
          lte: currentMonthEnd
        }
      }
    })

    stats.currentMonthRevenue = currentMonthPayments.reduce((sum, payment) => sum + payment.amount, 0)

    // Get last month revenue for comparison
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const lastMonthPayments = await prisma.payment.findMany({
      where: {
        status: "paid",
        paymentDate: {
          gte: lastMonthStart,
          lte: lastMonthEnd
        }
      }
    })

    stats.lastMonthRevenue = lastMonthPayments.reduce((sum, payment) => sum + payment.amount, 0)

    // Calculate growth percentage
    if (stats.lastMonthRevenue > 0) {
      stats.revenueGrowth = ((stats.currentMonthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100
    } else {
      stats.revenueGrowth = stats.currentMonthRevenue > 0 ? 100 : 0
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
