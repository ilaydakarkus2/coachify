"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

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

interface Log {
  id: string
  entityType: string
  action: string
  description: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  student: {
    id: string
    name: string
    email: string
  } | null
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentActivity, setRecentActivity] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/recent-activity?limit=10")
      ])

      const statsData = await statsRes.json()
      const activityData = await activityRes.json()

      setStats(statsData)
      setRecentActivity(activityData)
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            
            <div className="flex gap-4">
              <Link href="/admin/mentors" className="text-blue-600 hover:text-blue-800">
                Mentors
              </Link>
              <Link href="/admin/students" className="text-blue-600 hover:text-blue-800">
                Students
              </Link>
              <Link href="/admin/assignments" className="text-blue-600 hover:text-blue-800">
                Assignments
              </Link>
              <Link href="/admin/payments" className="text-blue-600 hover:text-blue-800">
                Payments
              </Link>
              <Link href="/admin/logs" className="text-blue-600 hover:text-blue-800">
                Logs
              </Link>
              <button onClick={() => router.push("/login")} className="text-red-600 hover:text-red-800">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {stats && (
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Total Students */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalStudents}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <span className="text-xs text-green-600">
                  {stats.activeStudents} active
                </span>
              </div>
            </div>

            {/* Active Students */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Students</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.activeStudents}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <span className="text-xs text-yellow-600">
                  {stats.droppedStudents} dropped
                </span>
                <span className="text-xs text-red-600">
                  {stats.refundedStudents} refunded
                </span>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">${stats.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <span className="text-xs text-blue-600">
                  This month: ${stats.currentMonthRevenue.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Total Mentors */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Mentors</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalMentors}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs text-gray-600">
                  Active assignments
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue Growth */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Growth</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.currentMonthRevenue.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Last Month</p>
                  <p className="text-xl font-semibold text-gray-600">${stats.lastMonthRevenue.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className={`text-lg font-semibold ${
                  stats.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {stats.revenueGrowth >= 0 ? "+" : ""}{stats.revenueGrowth.toFixed(1)}%
                </div>
                <p className="text-sm text-gray-500">vs. last month</p>
              </div>
            </div>

            {/* Upcoming Expirations */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Expirations (7 days)</h3>
              {stats.upcomingExpirations.length > 0 ? (
                <div className="space-y-3">
                  {stats.upcomingExpirations.map((expiration) => (
                    <div key={expiration.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{expiration.name}</p>
                        <p className="text-xs text-gray-500">{expiration.email}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${
                          expiration.daysLeft <= 2 ? "text-red-600" :
                          expiration.daysLeft <= 5 ? "text-yellow-600" :
                          "text-green-600"
                        }`}>
                          {expiration.daysLeft} days
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(expiration.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No upcoming expirations</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mentor Workload */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Mentor Workload</h3>
              {stats.mentorWorkload.length > 0 ? (
                <div className="space-y-3">
                  {stats.mentorWorkload.map((workload, index) => (
                    <div key={workload.mentor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{workload.mentor.name}</p>
                          <p className="text-xs text-gray-500">{workload.mentor.specialty}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">{workload.activeStudents}</p>
                        <p className="text-xs text-gray-500">students</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No active assignments</p>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <Link href="/admin/logs" className="text-sm text-blue-600 hover:text-blue-800">
                  View All
                </Link>
              </div>
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((log) => (
                    <div key={log.id} className="border-l-2 border-blue-500 pl-3">
                      <p className="text-sm text-gray-900">{log.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500">
                          By {log.user.name}
                        </p>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {log.action}
                        </span>
                        <p className="text-xs text-gray-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
