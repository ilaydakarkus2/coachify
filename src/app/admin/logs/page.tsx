"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Log {
  id: string
  entityType: string
  entityId: string
  action: string
  description: string
  createdAt: string
  metadata: any
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

export default function LogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<Log | null>(null)
  const [filters, setFilters] = useState({
    entityType: "",
    action: "",
    startDate: "",
    endDate: "",
    limit: "50"
  })

  useEffect(() => {
    fetchLogs()
  }, [filters])

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.entityType) params.append("entityType", filters.entityType)
      if (filters.action) params.append("action", filters.action)
      if (filters.startDate) params.append("startDate", filters.startDate)
      if (filters.endDate) params.append("endDate", filters.endDate)
      params.append("limit", filters.limit)

      const res = await fetch(`/api/admin/logs?${params.toString()}`)
      const data = await res.json()
      setLogs(data)
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = () => {
    setFilters({
      entityType: "",
      action: "",
      startDate: "",
      endDate: "",
      limit: "50"
    })
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-brand-ghost">
      {/* Üst Bar (Header) */}
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
              <Link href="/admin/mentor-earnings" className="text-brand-sand hover:text-white transition-colors">
                Mentor Kazançları
              </Link>
              <button onClick={() => router.push("/login")} className="bg-red-500/80 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-all">
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-brand-dark mb-6">İşlem Kayıtları</h2>

        {/* Filtreler */}
        <div className="bg-brand-sand p-5 rounded-2xl shadow-sm border border-brand-silver/20 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">İşlem Tipi</label>
              <select
                className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={filters.entityType}
                onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              >
                <option value="">Tümü</option>
                <option value="student">Öğrenci</option>
                <option value="mentor">Mentor</option>
                <option value="assignment">Atama</option>
                <option value="payment">Ödeme</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Eylem</label>
              <select
                className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              >
                <option value="">Tüm Eylemler</option>
                <option value="created">Oluşturuldu</option>
                <option value="updated">Güncellendi</option>
                <option value="deleted">Silindi</option>
                <option value="status_changed">Durum Değişti</option>
                <option value="mentor_changed">Mentor Değişti</option>
                <option value="payment_processed">Ödeme İşlendi</option>
                <option value="refunded">İade Edildi</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Başlangıç</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Bitiş</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full bg-brand-muted text-white px-4 py-2 rounded-xl font-bold hover:bg-brand-dark transition-all"
              >
                Filtreleri Sıfırla
              </button>
            </div>
          </div>
        </div>

        {/* Kayıtlar Tablosu */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-brand-silver/10">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-silver/10">
              <thead className="bg-brand-ghost">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Tarih & Saat</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Kategori</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Eylem</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Açıklama</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Yönetici</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-brand-muted uppercase tracking-widest">Detay</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-brand-silver/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-brand-sand/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-dark font-medium">
                      {new Date(log.createdAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-[10px] font-black uppercase rounded-full ${
                        log.entityType === "student" ? "bg-blue-100 text-blue-800" :
                        log.entityType === "mentor" ? "bg-purple-100 text-purple-800" :
                        log.entityType === "assignment" ? "bg-brand-primary/20 text-brand-logo" :
                        log.entityType === "payment" ? "bg-orange-100 text-orange-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {log.entityType === "student" ? "Öğrenci" : 
                         log.entityType === "mentor" ? "Mentor" :
                         log.entityType === "assignment" ? "Atama" :
                         log.entityType === "payment" ? "Ödeme" : log.entityType}
                      </span>
                      {log.student && (
                        <div className="text-[10px] text-brand-silver mt-1 font-bold italic">{log.student.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-[10px] font-black uppercase rounded-full ${
                        log.action === "created" ? "bg-green-100 text-green-800" :
                        log.action === "updated" ? "bg-blue-100 text-blue-800" :
                        log.action === "deleted" ? "bg-red-100 text-red-800" :
                        log.action === "refunded" ? "bg-orange-100 text-orange-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {log.action === "created" ? "Eklendi" :
                         log.action === "updated" ? "Güncellendi" :
                         log.action === "deleted" ? "Silindi" :
                         log.action === "refunded" ? "İade Edildi" : log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-brand-muted italic">
                      {log.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-brand-dark">{log.user.name}</div>
                      <div className="text-[10px] text-brand-silver">{log.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-brand-primary hover:text-brand-logo font-bold text-xs uppercase transition-colors"
                      >
                        İncele
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {logs.length === 0 && (
            <div className="text-center py-12 text-brand-silver font-medium italic">Kayıt bulunamadı.</div>
          )}
        </div>
      </div>

      {/* Log Detay Modalı */}
      {selectedLog && (
        <div className="fixed inset-0 bg-brand-dark/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border-t-8 border-brand-primary">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6 border-b border-brand-silver/10 pb-4">
                <h3 className="text-xl font-bold text-brand-dark">İşlem Detayları</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-brand-silver hover:text-brand-dark text-2xl transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-black text-brand-muted uppercase tracking-widest">Kategori</label>
                    <p className="text-brand-dark font-bold capitalize">{selectedLog.entityType}</p>
                  </div>
                  <div>
                    <label className="text-xs font-black text-brand-muted uppercase tracking-widest">İşlem ID</label>
                    <p className="text-brand-silver font-mono text-xs">{selectedLog.entityId}</p>
                  </div>
                  <div>
                    <label className="text-xs font-black text-brand-muted uppercase tracking-widest">Eylem</label>
                    <p className="text-brand-dark font-bold capitalize">{selectedLog.action}</p>
                  </div>
                  <div>
                    <label className="text-xs font-black text-brand-muted uppercase tracking-widest">Tarih & Saat</label>
                    <p className="text-brand-dark font-bold">{new Date(selectedLog.createdAt).toLocaleString('tr-TR')}</p>
                  </div>
                </div>
                <div className="bg-brand-ghost p-4 rounded-xl">
                  <label className="text-xs font-black text-brand-muted uppercase tracking-widest">Açıklama</label>
                  <p className="text-brand-dark mt-1 italic font-medium">"{selectedLog.description}"</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-brand-silver/10 p-3 rounded-lg">
                      <label className="text-xs font-black text-brand-muted uppercase tracking-widest">Yönetici</label>
                      <div className="text-brand-dark text-sm mt-1">
                        <span className="font-bold">{selectedLog.user.name}</span> <br/>
                        <span className="text-xs text-brand-silver">{selectedLog.user.email}</span>
                      </div>
                    </div>
                    {selectedLog.student && (
                      <div className="border border-brand-silver/10 p-3 rounded-lg">
                        <label className="text-xs font-black text-brand-muted uppercase tracking-widest">İlgili Öğrenci</label>
                        <div className="text-brand-dark text-sm mt-1">
                          <span className="font-bold">{selectedLog.student.name}</span> <br/>
                          <span className="text-xs text-brand-silver">{selectedLog.student.email}</span>
                        </div>
                      </div>
                    )}
                </div>
                {selectedLog.metadata && (
                  <div>
                    <label className="text-xs font-black text-brand-muted uppercase tracking-widest block mb-2">Teknik Detaylar (JSON)</label>
                    <pre className="p-4 bg-brand-dark text-brand-primary rounded-xl overflow-x-auto text-xs font-mono shadow-inner">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )}