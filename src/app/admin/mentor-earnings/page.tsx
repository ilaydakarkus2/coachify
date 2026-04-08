"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface MentorEarning {
  id: string
  mentorId: string
  studentId: string
  assignmentId: string
  completedWeeks: number
  amount: number
  cycleDate: string
  status: string
  triggerReason: string
  assignmentStart: string
  assignmentEnd: string | null
  notes: string | null
  mentor: {
    id: string
    name: string
    email: string
    specialty: string
  }
  student: {
    id: string
    name: string
    email: string
    status: string
  }
}

interface Mentor {
  id: string
  name: string
  email: string
  specialty: string
}

export default function MentorEarningsPage() {
  const router = useRouter()
  const [earnings, setEarnings] = useState<MentorEarning[]>([])
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [message, setMessage] = useState("")
  const [filters, setFilters] = useState({
    status: "",
    mentorId: "",
    cycleDateFrom: "",
    cycleDateTo: ""
  })

  useEffect(() => {
    fetchEarnings()
    fetchMentors()
  }, [filters])

  const fetchEarnings = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append("status", filters.status)
      if (filters.mentorId) params.append("mentorId", filters.mentorId)
      if (filters.cycleDateFrom) params.append("cycleDateFrom", filters.cycleDateFrom)
      if (filters.cycleDateTo) params.append("cycleDateTo", filters.cycleDateTo)

      const res = await fetch(`/api/admin/mentor-earnings?${params.toString()}`)
      const data = await res.json()
      setEarnings(data)
    } catch (error) {
      console.error("Kazançlar getirilemedi:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMentors = async () => {
    try {
      const res = await fetch("/api/admin/mentors")
      const data = await res.json()
      setMentors(data)
    } catch (error) {
      console.error("Mentorlar getirilemedi:", error)
    }
  }

  const handleCalculate = async () => {
    setCalculating(true)
    setMessage("")
    try {
      const res = await fetch("/api/admin/mentor-earnings/calculate", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setMessage(`${data.createdCount} yeni hakediş kaydı oluşturuldu`)
        fetchEarnings()
      } else {
        setMessage("Hesaplama başarısız: " + data.error)
      }
    } catch (error) {
      setMessage("Hesaplama sırasında hata oluştu")
    } finally {
      setCalculating(false)
    }
  }

  const handleMarkAsPaid = async (id: string) => {
    if (!confirm("Bu hakedisi ödendi olarak işaretlemek istediğinize emin misiniz?")) return
    try {
      const res = await fetch(`/api/admin/mentor-earnings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" })
      })
      if (res.ok) {
        fetchEarnings()
      }
    } catch (error) {
      console.error("Durum güncellenemedi:", error)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm("Bu hakedisi iptal etmek istediğinize emin misiniz?")) return
    try {
      const res = await fetch(`/api/admin/mentor-earnings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" })
      })
      if (res.ok) {
        fetchEarnings()
      }
    } catch (error) {
      console.error("Durum güncellenemedi:", error)
    }
  }

  const triggerLabel = (reason: string) => {
    const map: Record<string, string> = {
      assignment_end: "Mentor Değişimi",
      student_drop: "Öğrenci Bırakma",
      student_refund: "İade",
      periodic_calc: "Periyodik Hesaplama",
      manual: "Manuel"
    }
    return map[reason] || reason
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
      <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {labels[status] || status}
      </span>
    )
  }

  // Ozet hesapla
  const totalPending = earnings.filter(e => e.status === "pending").reduce((s, e) => s + e.amount, 0)
  const totalPaid = earnings.filter(e => e.status === "paid").reduce((s, e) => s + e.amount, 0)
  const totalAll = earnings.reduce((s, e) => s + e.amount, 0)

  if (loading) {
    return <div className="p-8">Yükleniyor...</div>
  }

  return (
    <div className="min-h-screen bg-brand-ghost">
      {/* Ust Bar */}
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
              <Link href="/admin/mentor-earnings" className="text-white font-bold underline">
                Mentor Kazançları
              </Link>
              <Link href="/admin/logs" className="text-brand-sand hover:text-white transition-colors">
                Kayıtlar
              </Link>
              <button onClick={() => router.push("/login")} className="bg-red-500/80 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-all">
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-brand-dark">Mentor Kazançları (Hakediş)</h2>
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className={`${calculating ? "bg-brand-muted" : "bg-brand-logo"} text-white px-5 py-2 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-brand-logo/20`}
          >
            {calculating ? "Hesaplanıyor..." : "Hesapla"}
          </button>
        </div>

        {message && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 font-medium">
            {message}
          </div>
        )}

        {/* Ozet Kartlari */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-silver/10">
            <div className="text-sm font-bold text-brand-muted mb-1">Toplam Hakediş</div>
            <div className="text-2xl font-black text-brand-dark">
              {totalAll.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-silver/10">
            <div className="text-sm font-bold text-brand-muted mb-1">Bekleyen Ödeme</div>
            <div className="text-2xl font-black text-yellow-600">
              {totalPending.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-silver/10">
            <div className="text-sm font-bold text-brand-muted mb-1">Ödenen</div>
            <div className="text-2xl font-black text-green-600">
              {totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </div>
          </div>
        </div>

        {/* Filtreler */}
        <div className="bg-brand-sand p-5 rounded-2xl shadow-sm border border-brand-silver/20 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Durum</label>
              <select
                className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Tüm Durumlar</option>
                <option value="pending">Bekliyor</option>
                <option value="paid">Ödendi</option>
                <option value="cancelled">İptal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Mentor</label>
              <select
                className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={filters.mentorId}
                onChange={(e) => setFilters({ ...filters, mentorId: e.target.value })}
              >
                <option value="">Tüm Mentorlar</option>
                {mentors.map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>{mentor.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Dönem Başlangıç</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={filters.cycleDateFrom}
                onChange={(e) => setFilters({ ...filters, cycleDateFrom: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Dönem Bitiş</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={filters.cycleDateTo}
                onChange={(e) => setFilters({ ...filters, cycleDateTo: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Tablo */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-brand-silver/10">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-silver/10">
              <thead className="bg-brand-ghost">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Mentor</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Öğrenci</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Hafta</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Tutar</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Dönem Tarihi</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Tetikleyici</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Durum</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-brand-muted uppercase tracking-widest">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-brand-silver/5">
                {earnings.map((earning) => (
                  <tr key={earning.id} className="hover:bg-brand-sand/30 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-brand-logo">{earning.mentor.name}</div>
                      <div className="text-xs text-brand-muted">{earning.mentor.specialty}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-brand-dark">{earning.student.name}</div>
                      <div className="text-xs text-brand-muted">{earning.student.email}</div>
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
                      <span className="text-xs bg-brand-ghost px-2 py-1 rounded-lg text-brand-muted font-medium">
                        {triggerLabel(earning.triggerReason)}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {statusBadge(earning.status)}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right space-x-3">
                      {earning.status === "pending" && (
                        <button
                          onClick={() => handleMarkAsPaid(earning.id)}
                          className="text-green-600 hover:text-green-800 font-bold text-xs uppercase transition-colors"
                        >
                          Öde
                        </button>
                      )}
                      {earning.status === "pending" && (
                        <button
                          onClick={() => handleCancel(earning.id)}
                          className="text-red-400 hover:text-red-600 font-bold text-xs uppercase transition-colors"
                        >
                          İptal
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {earnings.length === 0 && (
            <div className="text-center py-12 text-brand-silver font-medium italic">
              Hakediş kaydı bulunamadı. &quot;Hesapla&quot; butonuna basarak mevcut atamaları tarayabilirsiniz.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
