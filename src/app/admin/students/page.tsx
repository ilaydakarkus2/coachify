"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Student {
  id: string
  name: string
  email: string
  phone: string
  school: string
  grade: string
  startDate: string
  endDate: string | null
  status: string
  paymentStatus: string
  parentName?: string | null
  parentPhone?: string | null
  currentNetScore?: number | null
  targetNetScore?: number | null
  specialNote?: string | null
  dropReason?: string | null
  refundStatus?: string | null
  mentorChangeNote?: string | null
  droppedMonth?: string | null
  searchDay?: string | null
  searchMonth?: string | null
  contactPreference?: string | null
  sendMessage?: boolean
  membershipType?: string | null
  discountCode?: string | null
  studentAssignments: Array<{
    mentor: {
      id: string
      name: string
      email: string
    }
  }>
  _count: {
    studentAssignments: number
    payments: number
  }
}

export default function StudentsPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    school: "",
    grade: "",
    startDate: "",
    endDate: "",
    mentorId: "",
    parentName: "",
    parentPhone: "",
    currentNetScore: "",
    targetNetScore: "",
    specialNote: "",
    contactPreference: "",
    membershipType: "new",
    discountCode: "",
  })
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    school: "",
    grade: "",
    startDate: "",
    endDate: "",
    status: "",
    paymentStatus: "",
    parentName: "",
    parentPhone: "",
    currentNetScore: "",
    targetNetScore: "",
    specialNote: "",
    dropReason: "",
    refundStatus: "",
    contactPreference: "",
    sendMessage: false,
    membershipType: "",
    discountCode: "",
  })
  const [filters, setFilters] = useState({
    status: "",
    search: ""
  })
  const [showExtendForm, setShowExtendForm] = useState(false)
  const [extendStudent, setExtendStudent] = useState<Student | null>(null)
  const [extendData, setExtendData] = useState({ weeks: 1, reason: "" })
  const [extendLoading, setExtendLoading] = useState(false)

  useEffect(() => {
    fetchStudents()
  }, [filters])

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append("status", filters.status)
      if (filters.search) params.append("search", filters.search)

      const res = await fetch(`/api/admin/students?${params.toString()}`)
      const data = await res.json()
      setStudents(data)
    } catch (error) {
      console.error("Failed to fetch students:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log("[Frontend] Creating student with data:", formData)

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      console.log("[Frontend] Response status:", res.status)

      if (!res.ok) {
        const errorData = await res.json()
        console.error("[Frontend] Error response:", errorData)
        alert(`Failed to create student: ${errorData.error || "Unknown error"}`)
        return
      }

      const data = await res.json()
      console.log("[Frontend] Success response:", data)

      setShowForm(false)
      setFormData({
        name: "",
        email: "",
        phone: "",
        school: "",
        grade: "",
        startDate: "",
        endDate: "",
        mentorId: "",
        parentName: "",
        parentPhone: "",
        currentNetScore: "",
        targetNetScore: "",
        specialNote: "",
        contactPreference: "",
        membershipType: "new",
        discountCode: "",
      })
      fetchStudents()
    } catch (error) {
      console.error("[Frontend] Failed to create student:", error)
      alert("Failed to create student. Please try again.")
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return

    console.log("[Frontend] Updating student:", selectedStudent.id)
    console.log("[Frontend] Edit form data:", editFormData)

    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData)
      })

      console.log("[Frontend] Response status:", res.status)

      if (!res.ok) {
        const errorData = await res.json()
        console.error("[Frontend] Error response:", errorData)
        alert(`Failed to update student: ${errorData.error || "Unknown error"}`)
        return
      }

      const data = await res.json()
      console.log("[Frontend] Success response:", data)

      setShowEditForm(false)
      setSelectedStudent(null)
      fetchStudents()
    } catch (error) {
      console.error("[Frontend] Failed to update student:", error)
      alert("Failed to update student. Please try again.")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete the student and all related data.")) return

    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: "DELETE"
      })

      if (res.ok) {
        fetchStudents()
      }
    } catch (error) {
      console.error("Failed to delete student:", error)
    }
  }

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!extendStudent) return

    setExtendLoading(true)
    try {
      const res = await fetch(`/api/admin/students/${extendStudent.id}/extend-membership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extendData)
      })

      if (!res.ok) {
        const errorData = await res.json()
        alert(errorData.error || "Bir hata oluştu")
        return
      }

      setShowExtendForm(false)
      setExtendStudent(null)
      setExtendData({ weeks: 1, reason: "" })
      fetchStudents()
    } catch (error) {
      console.error("Failed to extend membership:", error)
      alert("Üyelik süresi uzatılamadı.")
    } finally {
      setExtendLoading(false)
    }
  }

  const openExtendForm = (student: Student) => {
    setExtendStudent(student)
    setExtendData({ weeks: 1, reason: "" })
    setShowExtendForm(true)
  }

  const getPreviewEndDate = () => {
    if (!extendStudent) return ""
    const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
    let base: Date
    if (extendStudent.endDate) {
      base = new Date(extendStudent.endDate)
      base = new Date(base.getTime() + extendData.weeks * MS_PER_WEEK)
    } else {
      base = new Date(new Date(extendStudent.startDate).getTime() + (4 + extendData.weeks) * MS_PER_WEEK)
    }
    return base.toLocaleDateString("tr-TR")
  }

  const openEditForm = (student: Student) => {
    console.log("[Frontend] Opening edit form for student:", student.id, student.name)
    setSelectedStudent(student)
    setEditFormData({
      name: student.name,
      email: student.email,
      phone: student.phone,
      school: student.school,
      grade: student.grade,
      startDate: student.startDate.split("T")[0],
      endDate: student.endDate ? student.endDate.split("T")[0] : "",
      status: student.status,
      paymentStatus: student.paymentStatus,
      parentName: student.parentName || "",
      parentPhone: student.parentPhone || "",
      currentNetScore: student.currentNetScore?.toString() || "",
      targetNetScore: student.targetNetScore?.toString() || "",
      specialNote: student.specialNote || "",
      dropReason: student.dropReason || "",
      refundStatus: student.refundStatus || "",
      contactPreference: student.contactPreference || "",
      sendMessage: student.sendMessage || false,
      membershipType: student.membershipType || "",
      discountCode: student.discountCode || "",
    })
    setShowEditForm(true)
    console.log("[Frontend] Edit form opened")
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
          <h2 className="text-2xl font-bold text-brand-dark">Öğrenciler</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`${showForm ? 'bg-brand-muted' : 'bg-brand-logo'} text-white px-5 py-2 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-brand-logo/20`}
          >
            {showForm ? "Vazgeç" : "+ Yeni Öğrenci"}
          </button>
        </div>

        {/* Filtreler */}
        <div className="bg-brand-sand p-5 rounded-2xl shadow-sm border border-brand-silver/20 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Durum</label>
              <select
                className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="dropped">Bırakan</option>
                <option value="refunded">İade</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Arama</label>
              <input
                type="text"
                placeholder="İsim veya e-posta ile ara..."
                className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Yeni Öğrenci Formu Modalı */}
        {showForm && (
          <div className="fixed inset-0 bg-brand-dark/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-t-8 border-brand-logo">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-brand-dark">Yeni Öğrenci Kaydı</h3>
                  <button onClick={() => setShowForm(false)} className="text-brand-silver hover:text-brand-dark text-2xl transition-colors">✕</button>
                </div>
                <form onSubmit={handleCreateSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-brand-muted mb-1.5">Ad Soyad *</label>
                        <input type="text" required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1.5">E-posta *</label>
                        <input type="email" required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1.5">Telefon *</label>
                        <input type="text" required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1.5">Okul *</label>
                        <input type="text" required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.school} onChange={(e) => setFormData({ ...formData, school: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1.5">Sınıf *</label>
                        <input type="text" required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1.5">Başlangıç Tarihi *</label>
                        <input type="date" required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1.5">Bitiş Tarihi</label>
                        <input type="date" className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                    </div>
                    <div className="md:col-span-2 border-t border-brand-silver/30 pt-4 mt-1">
                        <p className="text-xs font-black text-brand-muted uppercase tracking-wider mb-3">Veli & İletişim</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1.5">Veli Adı Soyadı</label>
                        <input type="text" className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.parentName} onChange={(e) => setFormData({ ...formData, parentName: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1.5">Veli Telefonu</label>
                        <input type="text" className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.parentPhone} onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1.5">İletişim Tercihi</label>
                        <select className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.contactPreference} onChange={(e) => setFormData({ ...formData, contactPreference: e.target.value })}>
                          <option value="">Belirtilmedi</option>
                          <option value="student">Öğrenci</option>
                          <option value="parent">Veli</option>
                        </select>
                    </div>
                    <div className="md:col-span-2 border-t border-brand-silver/30 pt-4 mt-1">
                        <p className="text-xs font-black text-brand-muted uppercase tracking-wider mb-3">Puan & Notlar</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1.5">Mevcut Net Puanı</label>
                        <input type="number" className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.currentNetScore} onChange={(e) => setFormData({ ...formData, currentNetScore: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1.5">Hedef Net Puanı</label>
                        <input type="number" className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.targetNetScore} onChange={(e) => setFormData({ ...formData, targetNetScore: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1.5">Üyelik Türü</label>
                        <select className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.membershipType} onChange={(e) => setFormData({ ...formData, membershipType: e.target.value })}>
                          <option value="new">Yeni</option>
                          <option value="renewal">Yenileme</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1.5">İndirim Kodu</label>
                        <input type="text" className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.discountCode} onChange={(e) => setFormData({ ...formData, discountCode: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-brand-muted mb-1.5">Özel Açıklama</label>
                        <input type="text" className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.specialNote} onChange={(e) => setFormData({ ...formData, specialNote: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-brand-logo text-white py-4 rounded-xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand-logo/20">Öğrenciyi Kaydet</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Düzenleme Formu Modalı */}
        {showEditForm && selectedStudent && (
          <div className="fixed inset-0 bg-brand-dark/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-t-8 border-brand-primary">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-brand-dark">Öğrenciyi Düzenle</h3>
                  <button onClick={() => { setShowEditForm(false); setSelectedStudent(null); }} className="text-brand-silver hover:text-brand-dark text-2xl transition-colors">✕</button>
                </div>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-brand-muted mb-1">Ad Soyad</label>
                        <input type="text" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">E-posta</label>
                        <input type="email" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">Telefon</label>
                        <input type="text" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">Okul</label>
                        <input type="text" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.school} onChange={(e) => setEditFormData({ ...editFormData, school: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">Sınıf</label>
                        <input type="text" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.grade} onChange={(e) => setEditFormData({ ...editFormData, grade: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">Başlangıç Tarihi</label>
                        <input type="date" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.startDate} onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">Bitiş Tarihi</label>
                        <input type="date" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.endDate} onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">Durum</label>
                        <select className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.status} onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}>
                          <option value="active">Aktif</option>
                          <option value="dropped">Bırakan</option>
                          <option value="refunded">İade</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">Ödeme Durumu</label>
                        <select className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.paymentStatus} onChange={(e) => setEditFormData({ ...editFormData, paymentStatus: e.target.value })}>
                          <option value="pending">Bekliyor</option>
                          <option value="paid">Ödendi</option>
                          <option value="refunded">İade Edildi</option>
                        </select>
                    </div>
                    <div className="md:col-span-2 border-t border-brand-silver/30 pt-3 mt-1">
                        <p className="text-xs font-black text-brand-muted uppercase tracking-wider mb-2">Veli & İletişim</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">Veli Adı Soyadı</label>
                        <input type="text" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.parentName} onChange={(e) => setEditFormData({ ...editFormData, parentName: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">Veli Telefonu</label>
                        <input type="text" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.parentPhone} onChange={(e) => setEditFormData({ ...editFormData, parentPhone: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">İletişim Tercihi</label>
                        <select className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.contactPreference} onChange={(e) => setEditFormData({ ...editFormData, contactPreference: e.target.value })}>
                          <option value="">Belirtilmedi</option>
                          <option value="student">Öğrenci</option>
                          <option value="parent">Veli</option>
                        </select>
                    </div>
                    <div className="md:col-span-2 border-t border-brand-silver/30 pt-3 mt-1">
                        <p className="text-xs font-black text-brand-muted uppercase tracking-wider mb-2">Puan & Notlar</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">Mevcut Net Puanı</label>
                        <input type="number" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.currentNetScore} onChange={(e) => setEditFormData({ ...editFormData, currentNetScore: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">Hedef Net Puanı</label>
                        <input type="number" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.targetNetScore} onChange={(e) => setEditFormData({ ...editFormData, targetNetScore: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">Üyelik Türü</label>
                        <select className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.membershipType} onChange={(e) => setEditFormData({ ...editFormData, membershipType: e.target.value })}>
                          <option value="">Belirtilmedi</option>
                          <option value="new">Yeni</option>
                          <option value="renewal">Yenileme</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">İndirim Kodu</label>
                        <input type="text" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.discountCode} onChange={(e) => setEditFormData({ ...editFormData, discountCode: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-brand-muted mb-1">Özel Açıklama</label>
                        <input type="text" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.specialNote} onChange={(e) => setEditFormData({ ...editFormData, specialNote: e.target.value })} />
                    </div>
                    {editFormData.status === "dropped" && (
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">Bırakma Nedeni</label>
                        <input type="text" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.dropReason} onChange={(e) => setEditFormData({ ...editFormData, dropReason: e.target.value })} />
                    </div>
                    )}
                    {editFormData.paymentStatus === "refunded" && (
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">İade Durumu</label>
                        <input type="text" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.refundStatus} onChange={(e) => setEditFormData({ ...editFormData, refundStatus: e.target.value })} />
                    </div>
                    )}
                    <div className="md:col-span-2 flex items-center gap-3">
                      <input type="checkbox" id="sendMessage" checked={editFormData.sendMessage} onChange={(e) => setEditFormData({ ...editFormData, sendMessage: e.target.checked })} className="w-4 h-4 rounded border-brand-silver text-brand-primary focus:ring-brand-primary" />
                      <label htmlFor="sendMessage" className="text-sm font-bold text-brand-muted">Mesaj Gidecek</label>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-logo transition-all mt-4 shadow-lg shadow-brand-primary/20">Güncelle</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Öğrenciler Tablosu */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-brand-silver/10">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-silver/10">
              <thead className="bg-brand-ghost">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Öğrenci</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">E-posta</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Okul / Sınıf</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Mentor</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Veli</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Puan</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Tarihler</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Durum</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Ödeme</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-brand-muted uppercase tracking-widest">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-brand-silver/5">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-brand-sand/30 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-brand-dark">{student.name}</div>
                      <div className="text-xs text-brand-muted">{student.phone}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-muted">{student.email}</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-brand-dark">{student.school}</div>
                      <div className="text-xs text-brand-muted">{student.grade}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-brand-logo">
                      {student.studentAssignments.length > 0 ? student.studentAssignments[0].mentor.name : "Atanmadı"}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm text-brand-dark">{student.parentName || "-"}</div>
                      <div className="text-xs text-brand-muted">{student.parentPhone || ""}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-dark">
                      {student.currentNetScore != null || student.targetNetScore != null ? (
                        <span>{student.currentNetScore ?? "-"} → {student.targetNetScore ?? "-"}</span>
                      ) : "-"}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-[11px] text-brand-dark font-medium">
                      <div>{new Date(student.startDate).toLocaleDateString('tr-TR')}</div>
                      {student.endDate && <div className="text-brand-silver italic">{new Date(student.endDate).toLocaleDateString('tr-TR')} bitiş</div>}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${
                        student.status === "active" ? "bg-brand-primary/10 text-brand-logo border border-brand-primary/20" :
                        student.status === "dropped" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                      }`}>
                        {student.status === "active" ? "Aktif" : student.status === "dropped" ? "Bıraktı" : "İade"}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${
                        student.paymentStatus === "paid" ? "bg-green-100 text-green-700" :
                        student.paymentStatus === "refunded" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {student.paymentStatus === "paid" ? "Ödendi" : student.paymentStatus === "refunded" ? "İade" : "Bekliyor"}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right space-x-3">
                      <button onClick={() => openEditForm(student)} className="text-brand-primary hover:text-brand-logo font-bold text-xs uppercase transition-colors">Düzenle</button>
                      {student.status === "active" && (
                        <button onClick={() => openExtendForm(student)} className="text-green-600 hover:text-green-800 font-bold text-xs uppercase transition-colors">Ek Süre</button>
                      )}
                      <button onClick={() => handleDelete(student.id)} className="text-red-400 hover:text-red-600 font-bold text-xs uppercase transition-colors">Sil</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {students.length === 0 && (
            <div className="text-center py-12 text-brand-silver font-medium italic">Öğrenci bulunamadı.</div>
          )}
        </div>

        {/* Ek Süre Modali */}
        {showExtendForm && extendStudent && (
          <div className="fixed inset-0 bg-brand-dark/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-t-8 border-green-500">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-brand-dark">Ek Süre Tanımla</h3>
                  <button onClick={() => { setShowExtendForm(false); setExtendStudent(null) }} className="text-brand-silver hover:text-brand-dark text-2xl transition-colors">✕</button>
                </div>
                <p className="text-sm text-brand-muted mb-1">
                  <span className="font-bold">{extendStudent.name}</span> için ek süre tanımlıyorsunuz.
                </p>
                <p className="text-xs text-brand-silver mb-5">
                  Mevcut bitiş: {extendStudent.endDate ? new Date(extendStudent.endDate).toLocaleDateString("tr-TR") : "Süresiz"}
                </p>
                <form onSubmit={handleExtendSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-brand-muted mb-1">Eklenecek Hafta Sayısı *</label>
                    <input
                      type="number"
                      min="1"
                      max="52"
                      required
                      className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      value={extendData.weeks}
                      onChange={(e) => setExtendData({ ...extendData, weeks: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      <span className="font-bold">Yeni bitiş tarihi:</span> {getPreviewEndDate()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-brand-muted mb-1">Not / Sebep</label>
                    <input
                      type="text"
                      placeholder="Opsiyonel..."
                      className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      value={extendData.reason}
                      onChange={(e) => setExtendData({ ...extendData, reason: e.target.value })}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={extendLoading}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all disabled:opacity-50"
                  >
                    {extendLoading ? "Kaydediliyor..." : `${extendData.weeks} Hafta Ekle`}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );}