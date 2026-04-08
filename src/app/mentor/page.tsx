"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"

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
    email: string
    school: string
    status: string
  }
}

interface MentorInfo {
  name: string
  specialty: string
  email: string
}

interface Summary {
  totalEarned: number
  totalPending: number
  totalRecords: number
  paidCount: number
  pendingCount: number
}

export default function MentorPage() {
  const router = useRouter()
  const [mentor, setMentor] = useState<MentorInfo | null>(null)
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [summary, setSummary] = useState<Summary>({ totalEarned: 0, totalPending: 0, totalRecords: 0, paidCount: 0, pendingCount: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch("/api/mentor/earnings")
      if (res.status === 401) {
        router.push("/login")
        return
      }
      const data = await res.json()
      if (res.ok) {
        setMentor(data.mentor)
        setEarnings(data.earnings)
        setSummary(data.summary)
      } else {
        setError(data.error || "Veri yüklenemedi")
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
      cancelled: "bg-red-100 text-red-700"
    }
    const labels: Record<string, string> = {
      pending: "Bekliyor",
      paid: "Ödendi",
      cancelled: "İptal"
    }
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
          <button onClick={() => router.push("/login")} className="bg-brand-logo text-white px-6 py-2 rounded-xl font-bold">Giriş Yap</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-ghost">
      {/* Ust Bar */}
      <div className="bg-brand-dark shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">
              Coachify <span className="text-brand-primary">Mentor Panel</span>
            </h1>
            <div className="flex gap-4 items-center">
              {mentor && (
                <span className="text-brand-sand text-sm">{mentor.name} - {mentor.specialty}</span>
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
        {/* Ozet Kartlari */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-silver/10">
            <div className="text-sm font-bold text-brand-muted mb-2">Toplam Kazanılan</div>
            <div className="text-3xl font-black text-green-600">
              {summary.totalEarned.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </div>
            <div className="text-xs text-brand-muted mt-1">{summary.paidCount} ödeme alındı</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-silver/10">
            <div className="text-sm font-bold text-brand-muted mb-2">Bekleyen Ödeme</div>
            <div className="text-3xl font-black text-yellow-600">
              {summary.totalPending.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </div>
            <div className="text-xs text-brand-muted mt-1">{summary.pendingCount} bekleyen hakediş</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-silver/10">
            <div className="text-sm font-bold text-brand-muted mb-2">Toplam Hakediş</div>
            <div className="text-3xl font-black text-brand-dark">
              {(summary.totalEarned + summary.totalPending).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </div>
            <div className="text-xs text-brand-muted mt-1">{summary.totalRecords} kayıt</div>
          </div>
        </div>

        {/* Hakedis Tablosu */}
        <h2 className="text-xl font-bold text-brand-dark mb-4">Hakediş Detayları</h2>
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-brand-silver/10">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-silver/10">
              <thead className="bg-brand-ghost">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Öğrenci</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Okul</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Hafta</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Tutar</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Dönem</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Durum</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-brand-silver/5">
                {earnings.map((earning) => (
                  <tr key={earning.id} className="hover:bg-brand-sand/30 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-brand-dark">{earning.student.name}</div>
                      <div className="text-xs text-brand-muted">{earning.student.email}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-muted">
                      {earning.student.school}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-muted font-medium">
                      {earning.completedWeeks} Hafta
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-brand-dark">
                      {earning.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-dark font-medium">
                      {new Date(earning.cycleDate).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {statusBadge(earning.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {earnings.length === 0 && (
            <div className="text-center py-12 text-brand-silver font-medium italic">
              Henüz hakediş kaydınız bulunmuyor.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
