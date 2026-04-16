"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"

// --- Types ---

interface StudentInfo {
  studentId: string
  name: string
  phone: string
  school: string
  grade: string
  studentStartDate: string
  endDate: string | null
  status: string
  assignmentStartDate: string
  assignmentEndDate?: string | null
  currentNetScore: number | null
  targetNetScore: number | null
}

interface Earning {
  id: string
  completedWeeks: number
  amount: number
  cycleDate: string
  status: string
  triggerReason: string
  assignmentStart: string
  assignmentEnd: string | null
  student: {
    id: string
    name: string
    school: string
    grade: string
    status: string
  }
}

interface MentorInfo {
  name: string
  specialty: string
  email: string
}

interface StudentSummary {
  totalActive: number
  totalPast: number
}

interface EarningSummary {
  totalEarned: number
  totalPending: number
  totalRecords: number
  paidCount: number
  pendingCount: number
}

// --- Component ---

export default function MentorPage() {
  const router = useRouter()
  const [mentor, setMentor] = useState<MentorInfo | null>(null)
  const [activeStudents, setActiveStudents] = useState<StudentInfo[]>([])
  const [pastStudents, setPastStudents] = useState<StudentInfo[]>([])
  const [studentSummary, setStudentSummary] = useState<StudentSummary>({ totalActive: 0, totalPast: 0 })
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [earningSummary, setEarningSummary] = useState<EarningSummary>({
    totalEarned: 0, totalPending: 0, totalRecords: 0, paidCount: 0, pendingCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<"students" | "earnings">("students")
  const [usdRate, setUsdRate] = useState(0)

  const toUsd = (tl: number) => usdRate > 0 ? (tl / usdRate).toFixed(2) : null

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [studentsRes, earningsRes] = await Promise.all([
        fetch("/api/mentor/students"),
        fetch("/api/mentor/earnings"),
      ])

      if (studentsRes.status === 401 || earningsRes.status === 401) {
        router.push("/login")
        return
      }

      const studentsData = await studentsRes.json()
      const earningsData = await earningsRes.json()

      if (studentsRes.ok) {
        setMentor(studentsData.mentor)
        setActiveStudents(studentsData.active)
        setPastStudents(studentsData.past)
        setStudentSummary(studentsData.summary)
      }

      if (earningsRes.ok) {
        setEarnings(earningsData.earnings)
        setEarningSummary(earningsData.summary)
        setUsdRate(earningsData.usdRate || 0)
      }

      if (!studentsRes.ok && !earningsRes.ok) {
        setError(studentsData.error || "Veri yüklenemedi")
      }
    } catch {
      setError("Bağlantı hatası")
    } finally {
      setLoading(false)
    }
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      paid: "bg-green-100 text-green-700 border border-green-200",
      cancelled: "bg-red-100 text-red-700",
    }
    const labels: Record<string, string> = { pending: "Bekliyor", paid: "Ödendi", cancelled: "İptal" }
    return (
      <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${styles[status] || ""}`}>
        {labels[status] || status}
      </span>
    )
  }

  const studentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-brand-primary/10 text-brand-logo border border-brand-primary/20",
      dropped: "bg-orange-100 text-orange-700",
      refunded: "bg-red-100 text-red-700",
    }
    const labels: Record<string, string> = { active: "Aktif", dropped: "Bıraktı", refunded: "İade" }
    return (
      <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${styles[status] || ""}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-ghost">Yükleniyor...</div>
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-ghost">
        <div className="text-center">
          <p className="text-red-600 font-bold mb-4">{error}</p>
          <button onClick={() => router.push("/login")} className="bg-brand-logo text-white px-6 py-2 rounded-xl font-bold">
            Giriş Yap
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-ghost">
      {/* Üst Bar */}
      <div className="bg-brand-dark shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">
              Coachify <span className="text-brand-primary">Mentor Panel</span>
            </h1>
            <div className="flex gap-4 items-center">
              {mentor && (
                <span className="text-brand-sand text-sm">{mentor.name} — {mentor.specialty}</span>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="bg-red-500/80 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-all"
              >
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Özet Kartları */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-silver/10">
            <div className="text-sm font-bold text-brand-muted mb-1">Aktif Öğrenci</div>
            <div className="text-3xl font-black text-brand-logo">{studentSummary.totalActive}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-silver/10">
            <div className="text-sm font-bold text-brand-muted mb-1">Geçmiş Öğrenci</div>
            <div className="text-3xl font-black text-brand-muted">{studentSummary.totalPast}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-silver/10">
            <div className="text-sm font-bold text-brand-muted mb-1">Kazanılan</div>
            <div className="text-2xl font-black text-green-600">
              {earningSummary.totalEarned.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
            </div>
            {toUsd(earningSummary.totalEarned) && (
              <div className="text-sm text-brand-muted mt-1">${toUsd(earningSummary.totalEarned)}</div>
            )}
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-silver/10">
            <div className="text-sm font-bold text-brand-muted mb-1">Bekleyen</div>
            <div className="text-2xl font-black text-yellow-600">
              {earningSummary.totalPending.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
            </div>
            {toUsd(earningSummary.totalPending) && (
              <div className="text-sm text-brand-muted mt-1">${toUsd(earningSummary.totalPending)}</div>
            )}
          </div>
          <div className="col-span-2 md:col-span-4 bg-brand-sand/40 rounded-2xl p-5 border border-brand-silver/20">
            <div className="text-sm font-bold text-brand-muted mb-1">Beklenen Toplam Ödeme (Yaklaşan Dönemler)</div>
            <div className="text-2xl font-black text-brand-logo">
              {(() => {
                const now = new Date()
                const upcoming = earnings.filter(e => e.status === "pending" && new Date(e.cycleDate) > now)
                const total = upcoming.reduce((sum, e) => sum + e.amount, 0)
                const dates = [...new Set(upcoming.map(e => new Date(e.cycleDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })))]
                return (
                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <span>{total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
                    {toUsd(total) && <span className="text-sm text-brand-muted">${toUsd(total)}</span>}
                    {dates.length > 0 && (
                      <span className="text-xs font-bold text-brand-muted">— {dates.join(", ")} tarihlerinde</span>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("students")}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              tab === "students"
                ? "bg-brand-logo text-white shadow-lg shadow-brand-logo/20"
                : "bg-white text-brand-muted border border-brand-silver/30 hover:bg-brand-sand/50"
            }`}
          >
            Öğrencilerim
          </button>
          <button
            onClick={() => setTab("earnings")}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              tab === "earnings"
                ? "bg-brand-logo text-white shadow-lg shadow-brand-logo/20"
                : "bg-white text-brand-muted border border-brand-silver/30 hover:bg-brand-sand/50"
            }`}
          >
            Hakedişlerim
          </button>
        </div>

        {/* ÖĞRENCİLER TAB */}
        {tab === "students" && (
          <div className="space-y-8">
            {/* Aktif Öğrenciler */}
            <div>
              <h2 className="text-xl font-bold text-brand-dark mb-4">
                Aktif Öğrenciler
                <span className="text-sm font-normal text-brand-muted ml-2">({activeStudents.length})</span>
              </h2>
              <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-brand-silver/10">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-brand-silver/10">
                    <thead className="bg-brand-ghost">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Öğrenci</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Telefon</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Okul / Sınıf</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Başlangıç</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Atanma Tarihi</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Puan</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-brand-silver/5">
                      {activeStudents.map((s) => (
                        <tr key={s.studentId + s.assignmentStartDate} className="hover:bg-brand-sand/30 transition-colors">
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-bold text-brand-dark">{s.name}</div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-muted">{s.phone}</td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-bold text-brand-dark">{s.school}</div>
                            <div className="text-xs text-brand-muted">{s.grade}</div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-dark font-medium">
                            {new Date(s.studentStartDate).toLocaleDateString("tr-TR")}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-logo font-medium">
                            {new Date(s.assignmentStartDate).toLocaleDateString("tr-TR")}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-dark">
                            {s.currentNetScore != null || s.targetNetScore != null ? (
                              <span>{s.currentNetScore ?? "-"} → {s.targetNetScore ?? "-"}</span>
                            ) : "-"}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            {studentStatusBadge(s.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {activeStudents.length === 0 && (
                  <div className="text-center py-12 text-brand-silver font-medium italic">Aktif öğrenciniz bulunmuyor.</div>
                )}
              </div>
            </div>

            {/* Geçmiş Öğrenciler */}
            <div>
              <h2 className="text-xl font-bold text-brand-dark mb-4">
                Geçmiş Öğrenciler
                <span className="text-sm font-normal text-brand-muted ml-2">({pastStudents.length})</span>
              </h2>
              <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-brand-silver/10">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-brand-silver/10">
                    <thead className="bg-brand-ghost">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Öğrenci</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Telefon</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Okul / Sınıf</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Başlangıç</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Atanma</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Bitiş</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-brand-silver/5">
                      {pastStudents.map((s) => (
                        <tr key={s.studentId + s.assignmentStartDate} className="hover:bg-brand-sand/30 transition-colors">
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-bold text-brand-dark">{s.name}</div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-muted">{s.phone}</td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-bold text-brand-dark">{s.school}</div>
                            <div className="text-xs text-brand-muted">{s.grade}</div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-dark font-medium">
                            {new Date(s.studentStartDate).toLocaleDateString("tr-TR")}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-logo font-medium">
                            {new Date(s.assignmentStartDate).toLocaleDateString("tr-TR")}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-silver italic">
                            {s.assignmentEndDate
                              ? new Date(s.assignmentEndDate).toLocaleDateString("tr-TR")
                              : "-"}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            {studentStatusBadge(s.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pastStudents.length === 0 && (
                  <div className="text-center py-12 text-brand-silver font-medium italic">Geçmiş öğrenci bulunmuyor.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* HAKEDİŞ TAB */}
        {tab === "earnings" && (
          <div>
            {(() => {
              const now = new Date()
              const upcomingEarnings = earnings.filter(e => new Date(e.cycleDate) > now)
              const pastEarnings = earnings.filter(e => new Date(e.cycleDate) <= now)

              const renderGrouped = (items: Earning[], title: string, emptyMsg: string, isUpcoming: boolean) => {
                if (items.length === 0) return null
                const grouped = items.reduce((acc: Record<string, { cycleDate: string; items: Earning[]; total: number }>, e) => {
                  const key = new Date(e.cycleDate).toLocaleDateString("tr-TR")
                  if (!acc[key]) acc[key] = { cycleDate: e.cycleDate, items: [], total: 0 }
                  acc[key].items.push(e)
                  acc[key].total += e.amount
                  return acc
                }, {} as Record<string, { cycleDate: string; items: Earning[]; total: number }>)
                const sortedGroups = Object.values(grouped).sort(
                  (a, b) => new Date(a.cycleDate).getTime() - new Date(b.cycleDate).getTime()
                )
                const grandTotal = sortedGroups.reduce((s, g) => s + g.total, 0)

                return (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-black text-brand-dark">{title}</h2>
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-black ${isUpcoming ? "text-brand-logo" : "text-yellow-600"}`}>
                          {grandTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                        </span>
                        {toUsd(grandTotal) && <span className="text-sm text-brand-muted">${toUsd(grandTotal)}</span>}
                      </div>
                    </div>
                    <div className="space-y-4">
                      {sortedGroups.map((group) => (
                        <div key={group.cycleDate} className={`bg-white shadow-xl rounded-2xl border overflow-hidden ${isUpcoming ? "border-brand-logo/30" : "border-brand-silver/10"}`}>
                          <div className={`${isUpcoming ? "bg-brand-primary/5" : "bg-brand-ghost"} px-6 py-4 flex justify-between items-center`}>
                            <div className="flex items-center gap-3">
                              {isUpcoming && (
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-brand-logo text-white">Ödeme Tarihi</span>
                              )}
                              <span className="text-sm font-black text-brand-dark">
                                {new Date(group.cycleDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                              </span>
                              <span className="text-xs text-brand-muted">({group.items.length} öğrenci)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-lg font-black ${isUpcoming ? "text-brand-logo" : "text-brand-dark"}`}>
                                {group.total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                              </span>
                              {toUsd(group.total) && <span className="text-xs text-brand-muted">${toUsd(group.total)}</span>}
                            </div>
                          </div>
                          <div className="divide-y divide-brand-silver/5">
                            {group.items.map((e) => (
                              <div key={e.id} className="px-6 py-4 flex items-center justify-between hover:bg-brand-sand/20 transition-colors">
                                <div>
                                  <div className="text-sm font-bold text-brand-dark">{e.student.name}</div>
                                  <div className="text-xs text-brand-muted">{e.student.school} • {e.student.grade}</div>
                                </div>
                                <div className="flex items-center gap-6">
                                  <span className="text-xs text-brand-muted font-medium">{e.completedWeeks} Hafta</span>
                                  <div>
                                    <span className="text-sm font-bold text-brand-dark">{e.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
                                    {toUsd(e.amount) && <span className="text-xs text-brand-muted ml-1">${toUsd(e.amount)}</span>}
                                  </div>
                                  {statusBadge(e.status)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }

              if (earnings.length === 0) {
                return (
                  <div className="bg-white shadow-xl rounded-2xl border border-brand-silver/10 text-center py-12 text-brand-silver font-medium italic">
                    Henüz hakediş kaydınız bulunmuyor.
                  </div>
                )
              }

              return (
                <div>
                  {renderGrouped(upcomingEarnings, "Beklenen Ödemeler", "", true)}
                  {renderGrouped(pastEarnings, "Geçmiş Hakedişler", "", false)}
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
