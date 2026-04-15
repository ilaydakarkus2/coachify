"use client"

import { useState, useEffect, useCallback } from "react"


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
  const [earnings, setEarnings] = useState<MentorEarning[]>([])
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [summary, setSummary] = useState({ totalPending: 0, totalPaid: 0, totalAll: 0 })
  const [filters, setFilters] = useState({
    status: "",
    mentorId: "",
    cycleDateFrom: "",
    cycleDateTo: ""
  })
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const fetchEarnings = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append("status", filters.status)
      if (filters.mentorId) params.append("mentorId", filters.mentorId)
      if (filters.cycleDateFrom) params.append("cycleDateFrom", filters.cycleDateFrom)
      if (filters.cycleDateTo) params.append("cycleDateTo", filters.cycleDateTo)
      params.append("page", page.toString())
      params.append("pageSize", PAGE_SIZE.toString())

      const res = await fetch(`/api/admin/mentor-earnings?${params.toString()}`)
      const data = await res.json()
      setEarnings(data.earnings || data)
      setTotalCount(data.total ?? 0)
      setTotalPages(Math.ceil((data.total ?? 0) / PAGE_SIZE))
      if (data.summary) setSummary(data.summary)
    } catch (error) {
      console.error("Kazanclar getirilemedi:", error)
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  const fetchMentors = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/mentors")
      const data = await res.json()
      setMentors(data)
    } catch (error) {
      console.error("Mentorlar getirilemedi:", error)
    }
  }, [])

  const runCalculation = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/mentor-earnings/calculate", { method: "POST" })
      if (res.ok) {
        fetchEarnings()
      }
    } catch (error) {
      console.error("Arka plan hesaplamasi basarisiz:", error)
    }
  }, [fetchEarnings])

  // Initial load: veriyi hemen goster, hesaplamayi arka planda yap
  useEffect(() => {
    fetchEarnings()
    fetchMentors()
    // Hesaplamayi arka planda calistir, UI'i bloklama
    fetch("/api/admin/mentor-earnings/calculate", { method: "POST" })
      .then(res => { if (res.ok) fetchEarnings() })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Filter changes: sayfayi sifirla ve tekrar cek
  useEffect(() => {
    setPage(1)
  }, [filters])

  // Page veya filter degisikliginde tekrar cek
  useEffect(() => {
    fetchEarnings()
  }, [fetchEarnings])

  const handleMarkAsPaid = async (id: string) => {
    if (!confirm("Bu hakedisi odendi olarak isaretlemek istediginize emin misiniz?")) return
    try {
      const res = await fetch(`/api/admin/mentor-earnings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" })
      })
      if (res.ok) fetchEarnings()
    } catch (error) {
      console.error("Durum guncellenemedi:", error)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm("Bu hakedisi iptal etmek istediginize emin misiniz?")) return
    try {
      const res = await fetch(`/api/admin/mentor-earnings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" })
      })
      if (res.ok) fetchEarnings()
    } catch (error) {
      console.error("Durum guncellenemedi:", error)
    }
  }

  const handleUndo = async (id: string, currentStatus: string) => {
    const statusLabel = currentStatus === "paid" ? "Ödendi" : "İptal"
    if (!confirm(`Bu hakedisi "${statusLabel}" durumundan "Bekliyor" durumuna geri almak istediğinize emin misiniz?`)) return
    try {
      const res = await fetch(`/api/admin/mentor-earnings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending" })
      })
      if (res.ok) fetchEarnings()
    } catch (error) {
      console.error("Geri alinamadi:", error)
    }
  }

  const triggerLabel = (reason: string) => {
    const map: Record<string, string> = {
      assignment_end: "Mentor Degisimi",
      student_drop: "Ogrenci Birakma",
      student_refund: "Iade",
      student_refund_14day: "14 Gun Iade",
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
      paid: "Odendi",
      cancelled: "Iptal"
    }
    return (
      <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading) {
    return <div className="p-8">Yukleniyor...</div>
  }

  return (
    <>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-brand-dark">Mentor Kazanclari (Hakedis)</h2>
        </div>

        {/* Ozet Kartlari - backend'den gelen summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-silver/10">
            <div className="text-sm font-bold text-brand-muted mb-1">Toplam Hakedis</div>
            <div className="text-2xl font-black text-brand-dark">
              {summary.totalAll.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-silver/10">
            <div className="text-sm font-bold text-brand-muted mb-1">Bekleyen Odeme</div>
            <div className="text-2xl font-black text-yellow-600">
              {summary.totalPending.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-silver/10">
            <div className="text-sm font-bold text-brand-muted mb-1">Odenen</div>
            <div className="text-2xl font-black text-green-600">
              {summary.totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
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
                <option value="">Tum Durumlar</option>
                <option value="pending">Bekliyor</option>
                <option value="paid">Odendi</option>
                <option value="cancelled">Iptal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Mentor</label>
              <select
                className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={filters.mentorId}
                onChange={(e) => setFilters({ ...filters, mentorId: e.target.value })}
              >
                <option value="">Tum Mentorlar</option>
                {mentors.map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>{mentor.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Donem Baslangic</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={filters.cycleDateFrom}
                onChange={(e) => setFilters({ ...filters, cycleDateFrom: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Donem Bitis</label>
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
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Ogrenci</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Hafta</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Tutar</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Donem Tarihi</th>
                  <th className="px-6 py-4 text-left text-xs font-brand-muted uppercase tracking-widest">Tetikleyici</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Durum</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-brand-muted uppercase tracking-widest">Islemler</th>
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
                      {earning.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
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
                          Ode
                        </button>
                      )}
                      {earning.status === "pending" && (
                        <button
                          onClick={() => handleCancel(earning.id)}
                          className="text-red-400 hover:text-red-600 font-bold text-xs uppercase transition-colors"
                        >
                          Iptal
                        </button>
                      )}
                      {(earning.status === "paid" || earning.status === "cancelled") && (
                        <button
                          onClick={() => handleUndo(earning.id, earning.status)}
                          className="text-amber-600 hover:text-amber-800 font-bold text-xs uppercase transition-colors"
                        >
                          Geri Al
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
              Hakedis kaydi bulunamadi.
            </div>
          )}
          {totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-brand-silver/10 bg-brand-ghost">
              <p className="text-sm text-brand-muted">
                {((page - 1) * PAGE_SIZE) + 1}&ndash;{Math.min(page * PAGE_SIZE, totalCount)} / {totalCount} kayit
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-bold rounded-lg border border-brand-silver/30 bg-white text-brand-dark hover:bg-brand-sand transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Onceki
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3.5 py-2 text-sm font-bold rounded-lg border transition-all ${
                      p === page
                        ? 'bg-brand-logo text-white border-brand-logo'
                        : 'border-brand-silver/30 bg-white text-brand-dark hover:bg-brand-sand'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-bold rounded-lg border border-brand-silver/30 bg-white text-brand-dark hover:bg-brand-sand transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>
    </>
  )
}
