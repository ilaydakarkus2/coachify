"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"


interface Assignment {
  id: string
  startDate: string
  endDate: string | null
  notes: string | null
  mentor: {
    id: string
    name: string
    email: string
    specialty: string
  }
}

interface Payment {
  id: string
  amount: number
  weeks: number
  paymentDate: string
  status: string
  notes: string | null
  mentor: {
    id: string
    name: string
    email: string
  }
}

interface Log {
  id: string
  entityType: string
  action: string
  description: string
  createdAt: string
  metadata?: any
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface Student {
  id: string
  name: string
  email: string
  phone: string
  school: string
  grade: string
  startDate: string
  endDate: string
  status: string
  paymentStatus: string
  packageDuration: number
  parentName?: string | null
  parentPhone?: string | null
  studentAssignments: Assignment[]
  payments: Payment[]
  logs: Log[]
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [reactivating, setReactivating] = useState(false)

  useEffect(() => {
    fetchStudent()
  }, [id])

  const fetchStudent = async () => {
    try {
      const res = await fetch(`/api/admin/students/${id}`)
      const data = await res.json()
      setStudent(data)
    } catch (error) {
      console.error("Öğrenci getirilemedi:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReactivate = async () => {
    if (!student) return
    if (!confirm(`"${student.name}" adlı öğrenciyi yeniden aktifleştirmek istediğinize emin misiniz?\n\nSon atama yeniden açılacak ve sonlandırma hakedişleri iptal edilecek.`)) return

    setReactivating(true)
    try {
      const res = await fetch(`/api/admin/students/${id}/reactivate`, { method: "POST" })
      if (res.ok) {
        fetchStudent()
      } else {
        const data = await res.json()
        alert(data.error || "Yeniden aktifleştirme başarısız")
      }
    } catch (error) {
      console.error("Yeniden aktifleştirme hatası:", error)
      alert("Bir hata oluştu")
    } finally {
      setReactivating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-brand-muted font-bold text-lg">Yükleniyor...</div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <p className="text-brand-muted font-bold text-lg mb-4">Öğrenci bulunamadı.</p>
          <Link href="/admin/students" className="bg-brand-logo text-white px-6 py-2 rounded-xl font-bold">Öğrencilere Dön</Link>
        </div>
      </div>
    )
  }

  const statusBadge = (status: string) => {
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

  const paymentBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: "bg-green-100 text-green-700 border border-green-200",
      pending: "bg-yellow-100 text-yellow-700",
      refunded: "bg-red-100 text-red-700",
    }
    const labels: Record<string, string> = { paid: "Ödendi", pending: "Bekliyor", refunded: "İade" }
    return (
      <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${styles[status] || ""}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <>
        {/* Üst Başlık */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/students" className="text-brand-logo hover:text-brand-dark font-bold text-sm transition-colors">
            ← Öğrencilere Dön
          </Link>
          <div className="h-6 w-px bg-brand-silver/30" />
          <h1 className="text-2xl font-black text-brand-dark">{student.name}</h1>
          {statusBadge(student.status)}
          {(student.status === "dropped" || student.status === "refunded") && (
            <button
              onClick={handleReactivate}
              disabled={reactivating}
              className="ml-auto px-5 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all disabled:opacity-50 shadow-lg shadow-green-600/20"
            >
              {reactivating ? "Aktifleştiriliyor..." : "Yeniden Aktifleştir"}
            </button>
          )}
        </div>

        {/* Öğrenci Bilgileri Kartı */}
        <div className="bg-white shadow-xl rounded-2xl p-6 mb-6 border border-brand-silver/10">
          <h2 className="text-lg font-black text-brand-dark mb-5">Öğrenci Bilgileri</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
            <div>
              <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">E-posta</label>
              <p className="text-sm font-bold text-brand-dark mt-1">{student.email}</p>
            </div>
            <div>
              <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Telefon</label>
              <p className="text-sm font-bold text-brand-dark mt-1">{student.phone}</p>
            </div>
            <div>
              <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Okul</label>
              <p className="text-sm font-bold text-brand-dark mt-1">{student.school}</p>
            </div>
            <div>
              <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Sınıf</label>
              <p className="mt-1"><span className="px-3 py-1 text-xs font-bold bg-brand-primary/10 text-brand-logo rounded-full">{student.grade}</span></p>
            </div>
            <div>
              <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Başlangıç Tarihi</label>
              <p className="text-sm font-bold text-brand-dark mt-1">{new Date(student.startDate).toLocaleDateString("tr-TR")}</p>
            </div>
            <div>
              <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Bitiş Tarihi</label>
              <p className="text-sm font-bold text-brand-dark mt-1">
                {new Date(student.endDate).toLocaleDateString("tr-TR")}
              </p>
            </div>
            <div>
              <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Paket Süresi</label>
              <p className="text-sm font-bold text-brand-dark mt-1">{student.packageDuration} ay</p>
            </div>
            <div>
              <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Ödeme Durumu</label>
              <div className="mt-1">{paymentBadge(student.paymentStatus)}</div>
            </div>
            {student.parentName && (
              <div>
                <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Veli Adı</label>
                <p className="text-sm font-bold text-brand-dark mt-1">{student.parentName}</p>
              </div>
            )}
            {student.parentPhone && (
              <div>
                <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Veli Telefonu</label>
                <p className="text-sm font-bold text-brand-dark mt-1">{student.parentPhone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Mentor Değişim Geçmişi */}
        <div className="bg-white shadow-xl rounded-2xl p-6 mb-6 border border-brand-silver/10">
          <h2 className="text-lg font-black text-brand-dark mb-5">Mentor Değişim Geçmişi</h2>
          {(() => {
            const mentorChanges = student.logs.filter(
              (log) => log.action === "mentor_changed" && log.entityType === "student"
            )
            if (mentorChanges.length === 0) {
              return <p className="text-brand-silver italic font-medium">Henüz mentor değişikliği yapılmamış.</p>
            }
            return (
              <div className="space-y-3">
                {mentorChanges.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 bg-brand-ghost rounded-xl px-5 py-3 border border-brand-silver/10">
                    <span className="text-sm font-bold text-brand-dark">
                      {new Date(log.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                    <span className="text-brand-silver">•</span>
                    <span className="text-sm">
                      <span className="font-bold text-brand-muted">{log.metadata?.previousMentorName || "?"}</span>
                      <span className="mx-2 text-brand-logo font-black">→</span>
                      <span className="font-bold text-brand-logo">{log.metadata?.newMentorName || "?"}</span>
                    </span>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>

        {/* Atama Geçmişi */}
        <div className="bg-white shadow-xl rounded-2xl p-6 mb-6 border border-brand-silver/10">
          <h2 className="text-lg font-black text-brand-dark mb-5">Atama Geçmişi</h2>
          {student.studentAssignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-brand-silver/10">
                <thead className="bg-brand-ghost">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Mentor</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Branş</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Başlangıç</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Bitiş</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-silver/5">
                  {student.studentAssignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-brand-sand/20 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-brand-dark">
                        {assignment.mentor.name}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="px-3 py-1 text-xs font-bold bg-brand-primary/10 text-brand-logo rounded-full">
                          {assignment.mentor.specialty}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-dark font-medium">
                        {new Date(assignment.startDate).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-dark font-medium">
                        {assignment.endDate ? new Date(assignment.endDate).toLocaleDateString("tr-TR") : "Devam ediyor"}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${
                          assignment.endDate
                            ? "bg-gray-100 text-brand-muted"
                            : "bg-brand-primary/10 text-brand-logo border border-brand-primary/20"
                        }`}>
                          {assignment.endDate ? "Sona Erdi" : "Aktif"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-brand-silver italic font-medium">Atama bulunamadı.</p>
          )}
        </div>

        {/* Ödeme Geçmişi */}
        <div className="bg-white shadow-xl rounded-2xl p-6 mb-6 border border-brand-silver/10">
          <h2 className="text-lg font-black text-brand-dark mb-5">Ödeme Geçmişi</h2>
          {student.payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-brand-silver/10">
                <thead className="bg-brand-ghost">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Mentor</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Tutar</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Hafta</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Ödeme Tarihi</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-silver/5">
                  {student.payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-brand-sand/20 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-brand-dark">
                        {payment.mentor.name}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-brand-dark">
                        {payment.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-muted font-medium">
                        {payment.weeks} hafta
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-dark font-medium">
                        {new Date(payment.paymentDate).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {paymentBadge(payment.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-brand-silver italic font-medium">Ödeme bulunamadı.</p>
          )}
        </div>

        {/* Aktivite Kayıtları */}
        <div className="bg-white shadow-xl rounded-2xl p-6 border border-brand-silver/10">
          <h2 className="text-lg font-black text-brand-dark mb-5">Aktivite Kayıtları</h2>
          {student.logs.length > 0 ? (
            <div className="space-y-4">
              {student.logs.map((log) => {
                const actionLabels: Record<string, string> = {
                  created: "Oluşturuldu",
                  updated: "Güncellendi",
                  mentor_changed: "Mentor Değişikliği",
                  deleted: "Silindi",
                }
                const actionColors: Record<string, string> = {
                  created: "border-green-400",
                  updated: "border-blue-400",
                  mentor_changed: "border-brand-logo",
                  deleted: "border-red-400",
                }
                return (
                  <div key={log.id} className={`border-l-3 pl-4 ${actionColors[log.action] || "border-brand-silver"}`} style={{ borderLeftWidth: "3px" }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-brand-dark">{log.description}</p>
                        <p className="text-xs text-brand-muted mt-1">
                          {log.user.name} ({log.user.role}) • {new Date(log.createdAt).toLocaleString("tr-TR")}
                        </p>
                      </div>
                      <span className="px-3 py-1 text-[10px] font-black uppercase rounded-full bg-brand-ghost text-brand-muted">
                        {actionLabels[log.action] || log.action}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-brand-silver italic font-medium">Aktivite kaydı bulunamadı.</p>
          )}
        </div>
    </>
  )
}
