"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
//aa
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
    <div className="min-h-screen bg-brand-ghost">
      {/* Header - Lacivert Arka Plan */}
      <div className="bg-brand-dark shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link href="/admin">
              <h1 className="text-2xl font-bold text-white cursor-pointer hover:text-brand-primary transition-colors">
                Coachify <span className="text-brand-primary">Admin</span>
              </h1>
            </Link>
            
            <div className="flex gap-4 items-center">
              <Link href="/admin/mentors" className="text-brand-sand hover:text-white transition-colors">
                Mentorlar
              </Link>
              <Link href="/admin/students" className="text-brand-sand hover:text-white transition-colors">
                Öğrenciler
              </Link>
              <Link href="/admin/assignments" className="text-brand-sand hover:text-white transition-colors">
                Atamalar
              </Link>
              <Link href="/admin/payments" className="text-brand-sand hover:text-white transition-colors">
                Ödemeler
              </Link>
              <Link href="/admin/logs" className="text-brand-sand hover:text-white transition-colors">
                İşlem Kayıtları
              </Link>
              <button onClick={() => router.push("/login")} className="bg-red-500/80 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-all">
                Çıkış Yap
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
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-brand-silver/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-brand-muted">Toplam Öğrenci</p>
                  <p className="text-2xl font-black text-brand-dark mt-1">{stats.totalStudents}</p>
                </div>
                <div className="bg-brand-primary/10 p-3 rounded-xl">
                  <svg className="w-6 h-6 text-brand-logo" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <span className="text-xs font-bold text-brand-logo">
                  {stats.activeStudents} aktif
                </span>
              </div>
            </div>

            {/* Active Students */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-brand-silver/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-brand-muted">Aktif Öğrenciler</p>
                  <p className="text-2xl font-black text-brand-logo mt-1">{stats.activeStudents}</p>
                </div>
                <div className="bg-brand-primary/20 p-3 rounded-xl">
                  <svg className="w-6 h-6 text-brand-logo" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <span className="text-xs font-bold text-orange-500">
                  {stats.droppedStudents} kaydı silinen
                </span>
                <span className="text-xs font-bold text-red-500">
                  {stats.refundedStudents} iade edilen
                </span>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-brand-sand rounded-2xl shadow-sm p-6 border border-brand-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-brand-muted">Toplam Gelir</p>
                  <p className="text-2xl font-black text-brand-dark mt-1">${stats.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-brand-dark p-3 rounded-xl shadow-lg shadow-brand-dark/20">
                  <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <span className="text-xs font-bold text-brand-muted">
                  Bu ay: ${stats.currentMonthRevenue.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Total Mentors */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-brand-silver/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-brand-muted">Toplam Mentor</p>
                  <p className="text-2xl font-black text-brand-dark mt-1">{stats.totalMentors}</p>
                </div>
                <div className="bg-brand-muted/10 p-3 rounded-xl">
                  <svg className="w-6 h-6 text-brand-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs font-bold text-brand-muted">
                  Aktif Atamalar
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue Growth */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-brand-silver/10">
              <h3 className="text-lg font-bold text-brand-dark mb-4">Gelir Artışı</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-brand-muted">Bu Ay</p>
                  <p className="text-2xl font-black text-brand-logo">${stats.currentMonthRevenue.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-brand-muted">Geçen Ay</p>
                  <p className="text-xl font-bold text-brand-silver">${stats.lastMonthRevenue.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className={`text-lg font-black ${
                  stats.revenueGrowth >= 0 ? "text-brand-logo" : "text-red-500"
                }`}>
                  {stats.revenueGrowth >= 0 ? "+" : ""}{stats.revenueGrowth.toFixed(1)}%
                </div>
                <p className="text-sm font-medium text-brand-muted">geçen aya göre</p>
              </div>
            </div>

            {/* Upcoming Expirations */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-brand-silver/10">
              <h3 className="text-lg font-bold text-brand-dark mb-4">Süresi Dolacaklar (7 günlük)</h3>
              {stats.upcomingExpirations.length > 0 ? (
                <div className="space-y-3">
                  {stats.upcomingExpirations.map((expiration) => (
                    <div key={expiration.id} className="flex items-center justify-between p-3 bg-brand-ghost rounded-xl border border-brand-silver/5">
                      <div>
                        <p className="text-sm font-bold text-brand-dark">{expiration.name}</p>
                        <p className="text-xs font-medium text-brand-muted">{expiration.email}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${
                          expiration.daysLeft <= 2 ? "text-red-500" :
                          expiration.daysLeft <= 5 ? "text-orange-500" :
                          "text-brand-logo"
                        }`}>
                          {expiration.daysLeft} days
                        </p>
                        <p className="text-xs font-bold text-brand-muted">
                          {new Date(expiration.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-brand-muted">Süresi dolan öğrenci yok</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mentor Workload */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-brand-silver/10">
              <h3 className="text-lg font-bold text-brand-dark mb-4">Mentor İş Yükü</h3>
              {stats.mentorWorkload.length > 0 ? (
                <div className="space-y-3">
                  {stats.mentorWorkload.map((workload, index) => (
                    <div key={workload.mentor.id} className="flex items-center justify-between p-3 bg-brand-ghost rounded-xl border border-brand-silver/5">
                      <div className="flex items-center gap-3">
                        <div className="bg-brand-dark text-brand-primary w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-brand-dark">{workload.mentor.name}</p>
                          <p className="text-xs font-medium text-brand-muted">{workload.mentor.specialty}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-brand-logo">{workload.activeStudents}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">öğrenciler</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-brand-muted">Aktif mentor yok</p>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-brand-silver/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-brand-dark">Son Hareketler</h3>
                <Link href="/admin/logs" className="text-sm font-bold text-brand-primary hover:text-brand-logo transition-colors">
                  Tüm Kayıtlar
                </Link>
              </div>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((log) => (
                    <div key={log.id} className="border-l-4 border-brand-primary pl-4 py-1">
                      <p className="text-sm font-bold text-brand-dark">{log.description}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-xs font-medium text-brand-muted">
                          By <span className="text-brand-dark">{log.user.name}</span>
                        </p>
                        <span className="text-[10px] font-black uppercase tracking-tighter bg-brand-sand text-brand-muted px-2 py-0.5 rounded-md">
                          {log.action}
                        </span>
                        <p className="text-[10px] font-bold text-brand-silver">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-brand-muted">Kayıtlı aktivite yok</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )}