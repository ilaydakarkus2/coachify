"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Payment {
  id: string
  amount: number
  weeks: number
  paymentDate: string
  status: string
  notes: string | null
  student: {
    id: string
    name: string
    email: string
    school: string
    grade: string
    status: string
  }
  mentor: {
    id: string
    name: string
    email: string
    specialty: string
  }
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
}

interface Mentor {
  id: string
  name: string
  email: string
  specialty: string
}

export default function PaymentsPage() {
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [formData, setFormData] = useState({
    studentId: "",
    mentorId: "",
    userId: "",
    amount: "",
    weeks: "",
    status: "pending",
    notes: ""
  })
  const [editFormData, setEditFormData] = useState({
    amount: "",
    weeks: "",
    status: "",
    notes: ""
  })
  const [filters, setFilters] = useState({
    status: "",
    studentId: "",
    mentorId: "",
    startDate: "",
    endDate: ""
  })

  useEffect(() => {
    fetchPayments()
    fetchStudents()
    fetchMentors()
  }, [filters])

  const fetchPayments = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append("status", filters.status)
      if (filters.studentId) params.append("studentId", filters.studentId)
      if (filters.mentorId) params.append("mentorId", filters.mentorId)
      if (filters.startDate) params.append("startDate", filters.startDate)
      if (filters.endDate) params.append("endDate", filters.endDate)

      const res = await fetch(`/api/admin/payments?${params.toString()}`)
      const data = await res.json()
      setPayments(data)
    } catch (error) {
      console.error("Failed to fetch payments:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/admin/students")
      const data = await res.json()
      setStudents(data)
    } catch (error) {
      console.error("Failed to fetch students:", error)
    }
  }

  const fetchMentors = async () => {
    try {
      const res = await fetch("/api/admin/mentors")
      const data = await res.json()
      setMentors(data)
    } catch (error) {
      console.error("Failed to fetch mentors:", error)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setShowForm(false)
        setFormData({
          studentId: "",
          mentorId: "",
          userId: "",
          amount: "",
          weeks: "",
          status: "pending",
          notes: ""
        })
        fetchPayments()
      }
    } catch (error) {
      console.error("Failed to create payment:", error)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPayment) return

    try {
      const res = await fetch(`/api/admin/payments/${selectedPayment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData)
      })

      if (res.ok) {
        setShowEditForm(false)
        setSelectedPayment(null)
        fetchPayments()
      }
    } catch (error) {
      console.error("Failed to update payment:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete the payment record.")) return

    try {
      const res = await fetch(`/api/admin/payments/${id}`, {
        method: "DELETE"
      })

      if (res.ok) {
        fetchPayments()
      }
    } catch (error) {
      console.error("Failed to delete payment:", error)
    }
  }

  const handleRefund = async (payment: Payment) => {
    if (!confirm(`Are you sure you want to refund this payment of $${payment.amount}?`)) return

    try {
      const res = await fetch(`/api/admin/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "refunded" })
      })

      if (res.ok) {
        fetchPayments()
      }
    } catch (error) {
      console.error("Failed to refund payment:", error)
    }
  }

  const openEditForm = (payment: Payment) => {
    setSelectedPayment(payment)
    setEditFormData({
      amount: payment.amount.toString(),
      weeks: payment.weeks.toString(),
      status: payment.status,
      notes: payment.notes || ""
    })
    setShowEditForm(true)
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
          <h2 className="text-2xl font-bold text-brand-dark">Ödemeler</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`${showForm ? 'bg-brand-muted' : 'bg-brand-logo'} text-white px-5 py-2 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-brand-logo/20`}
          >
            {showForm ? "Vazgeç" : "+ Yeni Ödeme"}
          </button>
        </div>

        {/* Filtreler */}
        <div className="bg-brand-sand p-5 rounded-2xl shadow-sm border border-brand-silver/20 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Durum</label>
              <select
                className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Tüm Durumlar</option>
                <option value="pending">Beklemede</option>
                <option value="paid">Ödendi</option>
                <option value="refunded">İade Edildi</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Öğrenci</label>
              <select
                className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={filters.studentId}
                onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}
              >
                <option value="">Tüm Öğrenciler</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>{student.name}</option>
                ))}
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
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Başlangıç</label>
              <input type="date" className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Bitiş</label>
              <input type="date" className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Yeni Ödeme Formu Modalı */}
        {showForm && (
          <div className="fixed inset-0 bg-brand-dark/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-t-8 border-brand-logo">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-brand-dark">Yeni Ödeme Kaydı</h3>
                  <button onClick={() => setShowForm(false)} className="text-brand-silver hover:text-brand-dark text-2xl transition-colors">✕</button>
                </div>
                <form onSubmit={handleCreateSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-brand-muted mb-1.5">Öğrenci *</label>
                      <select required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}>
                        <option value="">Öğrenci Seçin</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>{student.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-brand-muted mb-1.5">Mentor *</label>
                      <select required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.mentorId} onChange={(e) => setFormData({ ...formData, mentorId: e.target.value })}>
                        <option value="">Mentor Seçin</option>
                        {mentors.map((mentor) => (
                          <option key={mentor.id} value={mentor.id}>{mentor.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
  <label className="block text-sm font-bold text-brand-muted mb-1.5">Tutar (₺) *</label>
  <input 
    type="number" 
    step="0.01" 
    required 
    placeholder="0.00"
    className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" 
    value={formData.amount} 
    onChange={(e) => setFormData({ ...formData, amount: e.target.value })} 
  />
</div>
                    <div>
                      <label className="block text-sm font-bold text-brand-muted mb-1.5">Hafta Sayısı *</label>
                      <input type="number" required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.weeks} onChange={(e) => setFormData({ ...formData, weeks: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-brand-muted mb-1.5">Durum</label>
                      <select className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                        <option value="pending">Beklemede</option>
                        <option value="paid">Ödendi</option>
                        <option value="refunded">İade Edildi</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-brand-muted mb-1.5">Notlar</label>
                      <input type="text" className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-brand-logo text-white py-4 rounded-xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand-logo/20">Ödeme Kaydı Oluştur</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Düzenleme Modalı */}
        {showEditForm && selectedPayment && (
          <div className="fixed inset-0 bg-brand-dark/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-t-8 border-brand-primary">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-brand-dark">Ödemeyi Düzenle</h3>
                  <button onClick={() => { setShowEditForm(false); setSelectedPayment(null); }} className="text-brand-silver hover:text-brand-dark text-2xl transition-colors">✕</button>
                </div>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
  <label className="block text-sm font-bold text-brand-muted mb-1">Tutar (₺)</label>
  <input 
    type="number" 
    step="0.01" 
    className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" 
    value={editFormData.amount} 
    onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })} 
  />
</div>
                    <div>
                      <label className="block text-sm font-bold text-brand-muted mb-1">Hafta</label>
                      <input type="number" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.weeks} onChange={(e) => setEditFormData({ ...editFormData, weeks: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-brand-muted mb-1">Durum</label>
                      <select className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.status} onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}>
                        <option value="pending">Beklemede</option>
                        <option value="paid">Ödendi</option>
                        <option value="refunded">İade Edildi</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-brand-muted mb-1">Notlar</label>
                      <input type="text" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.notes} onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-logo transition-all mt-4 shadow-lg shadow-brand-primary/20">Güncelle</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tablo */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-brand-silver/10">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-silver/10">
              <thead className="bg-brand-ghost">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Öğrenci</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Mentor</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Tutar</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Süre</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Ödeme Tarihi</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Durum</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-brand-muted uppercase tracking-widest">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-brand-silver/5">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-brand-sand/30 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-brand-dark">{payment.student.name}</div>
                      <div className="text-xs text-brand-muted">{payment.student.email}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-brand-logo">{payment.mentor.name}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-brand-dark">
  {payment.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-muted">{payment.weeks} Hafta</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-dark font-medium">{new Date(payment.paymentDate).toLocaleDateString('tr-TR')}</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${
                        payment.status === "paid" ? "bg-brand-primary/10 text-brand-logo border border-brand-primary/20" :
                        payment.status === "refunded" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {payment.status === "paid" ? "Ödendi" : payment.status === "refunded" ? "İade" : "Bekliyor"}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right space-x-3">
                      <button onClick={() => openEditForm(payment)} className="text-brand-primary hover:text-brand-logo font-bold text-xs uppercase transition-colors">Düzenle</button>
                      {payment.status === "paid" && (
                        <button onClick={() => handleRefund(payment)} className="text-orange-500 hover:text-orange-700 font-bold text-xs uppercase transition-colors">İade Et</button>
                      )}
                      <button onClick={() => handleDelete(payment.id)} className="text-red-400 hover:text-red-600 font-bold text-xs uppercase transition-colors">Sil</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {payments.length === 0 && (
            <div className="text-center py-12 text-brand-silver font-medium italic">Ödeme kaydı bulunamadı.</div>
          )}
        </div>
      </div>
    </div>
  );}