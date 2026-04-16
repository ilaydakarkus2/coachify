"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"


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
  packageType?: string | null
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
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
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
    packageType: "1_aylik",
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
    packageType: "",
    discountCode: "",
    mentorId: "",
  })
  const [editMentorSaving, setEditMentorSaving] = useState(false)
  const [mentorChangeDate, setMentorChangeDate] = useState(new Date().toISOString().split("T")[0])
  const [phoneErrors, setPhoneErrors] = useState<{ phone?: string; parentPhone?: string }>({})
  const [editPhoneErrors, setEditPhoneErrors] = useState<{ phone?: string; parentPhone?: string }>({})
  const [filters, setFilters] = useState({
    status: "",
    paymentStatus: "",
    search: "",
    mentorId: ""
  })
  const [mentors, setMentors] = useState<Array<{ id: string; name: string }>>([])
  const [mentorSearch, setMentorSearch] = useState("")
  const [mentorDropdownOpen, setMentorDropdownOpen] = useState(false)
  const [showExtendForm, setShowExtendForm] = useState(false)
  const [extendStudent, setExtendStudent] = useState<Student | null>(null)
  const [extendData, setExtendData] = useState({ weeks: 1, reason: "" })
  const [extendLoading, setExtendLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 20
  const [reactivating, setReactivating] = useState<string | null>(null)

  const validatePhoneFormat = (value: string): string | null => {
    if (!value || value.trim() === "") return null
    if (!/^\+90\d{10}$/.test(value.trim())) {
      return "+90 ile başlamalı, 10 rakam (örn: +905551234567)"
    }
    return null
  }

  useEffect(() => {
    setPage(1)
  }, [filters])

  useEffect(() => {
    fetchStudents()
  }, [filters, page])

  useEffect(() => {
    fetch("/api/admin/mentors")
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setMentors(data.sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr-TR'))) })
      .catch(() => {})
  }, [])

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append("status", filters.status)
      if (filters.search) params.append("search", filters.search)
      if (filters.mentorId) params.append("mentorId", filters.mentorId)
      // "late"/"very_late" filtresi: DB'de pending olanları getir, frontend'de computed status'a göre filtrele
      if (filters.paymentStatus === "late" || filters.paymentStatus === "very_late") {
        params.append("paymentStatus", "pending")
      } else if (filters.paymentStatus) {
        params.append("paymentStatus", filters.paymentStatus)
      }
      params.append("page", page.toString())
      params.append("pageSize", PAGE_SIZE.toString())

      const res = await fetch(`/api/admin/students?${params.toString()}`)
      const data = await res.json()
      setStudents(data.students || data)
      setTotalCount(data.total ?? (Array.isArray(data) ? data.length : 0))
    } catch (error) {
      console.error("Failed to fetch students:", error)
    } finally {
      setLoading(false)
    }
  }

  // Ödeme durumunu otomatik hesapla: endDate'ye göre gecikme tespiti
  const getEffectivePaymentStatus = (student: Student): { label: string; style: string } => {
    if (student.paymentStatus === "paid") return { label: "Ödendi", style: "bg-green-100 text-green-700" }
    if (student.paymentStatus === "late") return { label: "Gecikti", style: "bg-orange-100 text-orange-700" }
    if (student.paymentStatus === "very_late") return { label: "Çok Gecikti", style: "bg-red-100 text-red-700" }
    // pending: endDate'ye göre otomatik hesapla
    if (student.endDate && student.paymentStatus === "pending") {
      const now = new Date()
      const end = new Date(student.endDate)
      now.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays >= 7) return { label: "Çok Gecikti", style: "bg-red-100 text-red-700" }
      if (diffDays >= 2) return { label: "Gecikti", style: "bg-orange-100 text-orange-700" }
    }
    return { label: "Bekliyor", style: "bg-yellow-100 text-yellow-700" }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Telefon dogrulama
    const phoneErr = validatePhoneFormat(formData.phone)
    const parentPhoneErr = validatePhoneFormat(formData.parentPhone)
    if (phoneErr || parentPhoneErr) {
      setPhoneErrors({ phone: phoneErr || undefined, parentPhone: parentPhoneErr || undefined })
      return
    }
    setPhoneErrors({})

    setCreating(true)
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
        packageType: "1_aylik",
        discountCode: "",
      })
      fetchStudents()
    } catch (error) {
      console.error("[Frontend] Failed to create student:", error)
      alert("Failed to create student. Please try again.")
    } finally {
      setCreating(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return

    // Telefon dogrulama
    const phoneErr = validatePhoneFormat(editFormData.phone)
    const parentPhoneErr = validatePhoneFormat(editFormData.parentPhone)
    if (phoneErr || parentPhoneErr) {
      setEditPhoneErrors({ phone: phoneErr || undefined, parentPhone: parentPhoneErr || undefined })
      return
    }
    setEditPhoneErrors({})

    console.log("[Frontend] Updating student:", selectedStudent.id)
    console.log("[Frontend] Edit form data:", editFormData)

    setUpdating(true)
    try {
      // Mentor değişikliği kontrolü
      const currentMentorId = selectedStudent.studentAssignments?.[0]?.mentor?.id || ""
      const newMentorId = editFormData.mentorId
      const mentorChanged = newMentorId && newMentorId !== currentMentorId

      // Önce öğrenci bilgilerini güncelle (mentorId hariç)
      const { mentorId, ...studentData } = editFormData
      const res = await fetch(`/api/admin/students/${selectedStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData)
      })

      if (!res.ok) {
        const errorData = await res.json()
        alert(`Güncelleme hatası: ${errorData.error || "Bilinmeyen hata"}`)
        return
      }

      // Mentor değişikliği varsa
      if (mentorChanged) {
        setEditMentorSaving(true)
        const mentorRes = await fetch(`/api/admin/students/${selectedStudent.id}/change-mentor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newMentorId,
            startDate: mentorChangeDate || new Date().toISOString().split("T")[0],
            notes: selectedStudent.mentorChangeNote || ""
          })
        })

        if (!mentorRes.ok) {
          const errorData = await mentorRes.json()
          alert(`Öğrenci bilgileri güncellendi ancak mentor değişikliği başarısız: ${errorData.error || "Hata"}`)
        }
        setEditMentorSaving(false)
      }

      setShowEditForm(false)
      setSelectedStudent(null)
      fetchStudents()
    } catch (error) {
      console.error("[Frontend] Failed to update student:", error)
      alert("Güncelleme başarısız. Tekrar deneyin.")
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete the student and all related data.")) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: "DELETE"
      })

      if (res.ok) {
        fetchStudents()
      }
    } catch (error) {
      console.error("Failed to delete student:", error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleReactivate = async (studentId: string, studentName: string) => {
    if (!confirm(`"${studentName}" adlı öğrenciyi yeniden aktifleştirmek istediğinize emin misiniz?`)) return

    setReactivating(studentId)
    try {
      const res = await fetch(`/api/admin/students/${studentId}/reactivate`, { method: "POST" })
      if (res.ok) {
        fetchStudents()
      } else {
        const data = await res.json()
        alert(data.error || "Yeniden aktifleştirme başarısız")
      }
    } catch (error) {
      console.error("Yeniden aktifleştirme hatası:", error)
    } finally {
      setReactivating(null)
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
      packageType: student.packageType || "",
      discountCode: student.discountCode || "",
      mentorId: student.studentAssignments?.[0]?.mentor?.id || "",
    })
    setShowEditForm(true)
    console.log("[Frontend] Edit form opened")
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Ödeme Durumu</label>
              <select
                className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={filters.paymentStatus}
                onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
              >
                <option value="">Tümü</option>
                <option value="paid">Ödendi</option>
                <option value="pending">Bekliyor</option>
                <option value="late">Gecikti</option>
                <option value="very_late">Çok Gecikti</option>
              </select>
            </div>
            <div className="relative">
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Mentor</label>
              <input
                type="text"
                placeholder={filters.mentorId ? mentors.find(m => m.id === filters.mentorId)?.name || "Mentor ara..." : "Tüm Mentorlar"}
                className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={mentorSearch}
                onChange={(e) => { setMentorSearch(e.target.value); setMentorDropdownOpen(true) }}
                onFocus={() => setMentorDropdownOpen(true)}
                onBlur={() => setTimeout(() => setMentorDropdownOpen(false), 150)}
              />
              {filters.mentorId && !mentorSearch && (
                <button
                  type="button"
                  className="absolute right-8 top-[34px] text-brand-muted hover:text-brand-dark"
                  onClick={() => { setFilters({ ...filters, mentorId: "" }); setMentorSearch("") }}
                >
                  ×
                </button>
              )}
              {mentorDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-brand-silver rounded-lg shadow-lg max-h-60 overflow-auto">
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2 hover:bg-brand-sand/50 text-sm ${!filters.mentorId ? "bg-brand-primary/10 font-bold" : ""}`}
                    onMouseDown={() => { setFilters({ ...filters, mentorId: "" }); setMentorSearch(""); setMentorDropdownOpen(false) }}
                  >
                    Tüm Mentorlar
                  </button>
                  {mentors
                    .filter(m => !mentorSearch || m.name.toLowerCase().includes(mentorSearch.toLowerCase()))
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 hover:bg-brand-sand/50 text-sm ${filters.mentorId === m.id ? "bg-brand-primary/10 font-bold" : ""}`}
                        onMouseDown={() => { setFilters({ ...filters, mentorId: m.id }); setMentorSearch(""); setMentorDropdownOpen(false) }}
                      >
                        {m.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Arama</label>
              <input
                type="text"
                placeholder="İsim, e-posta, telefon veya veli bilgileri ile ara..."
                className="w-full px-3 py-2 bg-white border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Yeni Öğrenci Formu */}
        {showForm && (
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-brand-silver/10 mb-6">
            <h3 className="text-xl font-bold text-brand-dark mb-4">Yeni Öğrenci Ekle</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-brand-muted mb-1">Ad Soyad *</label>
                  <input type="text" required className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-muted mb-1">E-posta *</label>
                  <input type="email" required className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-muted mb-1">Telefon</label>
                  <input type="text" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary outline-none ${phoneErrors.phone ? 'border-red-400' : 'border-brand-silver'}`} value={formData.phone} onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); if (phoneErrors.phone) setPhoneErrors({ ...phoneErrors, phone: undefined }) }} onBlur={() => { const err = validatePhoneFormat(formData.phone); if (err) setPhoneErrors({ ...phoneErrors, phone: err }) }} />
                  {phoneErrors.phone && <p className="text-xs text-red-500 mt-1">{phoneErrors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-muted mb-1">Okul</label>
                  <input type="text" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.school} onChange={(e) => setFormData({ ...formData, school: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-muted mb-1">Sınıf</label>
                  <input type="text" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-muted mb-1">Mentor *</label>
                  <select required className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.mentorId} onChange={(e) => setFormData({ ...formData, mentorId: e.target.value })}>
                    <option value="">Mentor Seç</option>
                    {mentors.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-muted mb-1">Başlangıç Tarihi</label>
                  <input type="date" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-muted mb-1">Paket Türü *</label>
                  <select required className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.packageType} onChange={(e) => setFormData({ ...formData, packageType: e.target.value })}>
                    <option value="1_aylik">1 Aylık</option>
                    <option value="yks_kadar">YKS'ye Kadar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-muted mb-1">Bitiş Tarihi</label>
                  <p className="text-[10px] text-brand-silver mb-1">Boş bırakılırsa paket türüne göre otomatik hesaplanır</p>
                  <input type="date" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                </div>
                <div className="md:col-span-2 border-t border-brand-silver/30 pt-3 mt-1">
                  <p className="text-xs font-black text-brand-muted uppercase tracking-wider mb-2">Veli Bilgileri</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-muted mb-1">Veli Adı Soyadı</label>
                  <input type="text" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.parentName} onChange={(e) => setFormData({ ...formData, parentName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-muted mb-1">Veli Telefonu</label>
                  <input type="text" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary outline-none ${phoneErrors.parentPhone ? 'border-red-400' : 'border-brand-silver'}`} value={formData.parentPhone} onChange={(e) => { setFormData({ ...formData, parentPhone: e.target.value }); if (phoneErrors.parentPhone) setPhoneErrors({ ...phoneErrors, parentPhone: undefined }) }} onBlur={() => { const err = validatePhoneFormat(formData.parentPhone); if (err) setPhoneErrors({ ...phoneErrors, parentPhone: err }) }} />
                  {phoneErrors.parentPhone && <p className="text-xs text-red-500 mt-1">{phoneErrors.parentPhone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-muted mb-1">İletişim Tercihi</label>
                  <select className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.contactPreference} onChange={(e) => setFormData({ ...formData, contactPreference: e.target.value })}>
                    <option value="">Belirtilmedi</option>
                    <option value="student">Öğrenci</option>
                    <option value="parent">Veli</option>
                    <option value="both">Hem Öğrenci Hem Veli</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-muted mb-1">İndirim Kodu</label>
                  <input type="text" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.discountCode} onChange={(e) => setFormData({ ...formData, discountCode: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-brand-muted mb-1">Özel Açıklama</label>
                  <input type="text" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.specialNote} onChange={(e) => setFormData({ ...formData, specialNote: e.target.value })} />
                </div>
              </div>
              <button type="submit" disabled={creating} className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-logo transition-all mt-2 shadow-lg shadow-brand-primary/20 disabled:opacity-70 flex items-center justify-center gap-2">
                {creating ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Ekleniyor...</>
                ) : "Öğrenci Ekle"}
              </button>
            </form>
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
                        <input type="text" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary outline-none ${editPhoneErrors.phone ? 'border-red-400' : 'border-brand-silver'}`} value={editFormData.phone} onChange={(e) => { setEditFormData({ ...editFormData, phone: e.target.value }); if (editPhoneErrors.phone) setEditPhoneErrors({ ...editPhoneErrors, phone: undefined }) }} onBlur={() => { const err = validatePhoneFormat(editFormData.phone); if (err) setEditPhoneErrors({ ...editPhoneErrors, phone: err }) }} />
                        {editPhoneErrors.phone && <p className="text-xs text-red-500 mt-1">{editPhoneErrors.phone}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">Sınıf</label>
                        <input type="text" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.grade} onChange={(e) => setEditFormData({ ...editFormData, grade: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">Mentor</label>
                        <select className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.mentorId} onChange={(e) => setEditFormData({ ...editFormData, mentorId: e.target.value })}>
                          <option value="">Mentor Yok</option>
                          {mentors.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                        {editFormData.mentorId && editFormData.mentorId !== (selectedStudent?.studentAssignments?.[0]?.mentor?.id || "") && (
                          <>
                            <p className="text-xs text-amber-600 mt-1 font-medium">Dikkat: Mentor değişikliği eski mentorun hakedişini sonlandırır.</p>
                            <div className="mt-2">
                              <label className="block text-xs font-bold text-brand-muted mb-1">Değişiklik Tarihi</label>
                              <input type="date" className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none text-sm" value={mentorChangeDate} onChange={(e) => setMentorChangeDate(e.target.value)} />
                              <p className="text-[10px] text-brand-muted mt-0.5">Bu tarih hakediş hesaplamasını etkiler.</p>
                            </div>
                          </>
                        )}
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
                          <option value="late">Gecikti</option>
                          <option value="very_late">Çok Gecikti</option>
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
                        <input type="text" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary outline-none ${editPhoneErrors.parentPhone ? 'border-red-400' : 'border-brand-silver'}`} value={editFormData.parentPhone} onChange={(e) => { setEditFormData({ ...editFormData, parentPhone: e.target.value }); if (editPhoneErrors.parentPhone) setEditPhoneErrors({ ...editPhoneErrors, parentPhone: undefined }) }} onBlur={() => { const err = validatePhoneFormat(editFormData.parentPhone); if (err) setEditPhoneErrors({ ...editPhoneErrors, parentPhone: err }) }} />
                        {editPhoneErrors.parentPhone && <p className="text-xs text-red-500 mt-1">{editPhoneErrors.parentPhone}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">İletişim Tercihi</label>
                        <select className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.contactPreference} onChange={(e) => setEditFormData({ ...editFormData, contactPreference: e.target.value })}>
                          <option value="">Belirtilmedi</option>
                          <option value="student">Öğrenci</option>
                          <option value="parent">Veli</option>
                          <option value="both">Hem Öğrenci Hem Veli</option>
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
                        <label className="block text-sm font-bold text-brand-muted mb-1">Kayıt Türü</label>
                        <select className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.membershipType} onChange={(e) => setEditFormData({ ...editFormData, membershipType: e.target.value })}>
                          <option value="">Belirtilmedi</option>
                          <option value="new">Yeni</option>
                          <option value="renewal">Yenileme</option>
                        </select>
                    </div>
                    <div>                        <label className="block text-sm font-bold text-brand-muted mb-1">Paket Türü</label>                        <select className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.packageType} onChange={(e) => setEditFormData({ ...editFormData, packageType: e.target.value })}>                          <option value="">Belirtilmedi</option>                          <option value="1_aylik">1 Aylık</option>                          <option value="yks_kadar">YKS'ye Kadar</option>                        </select>                    </div>
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
                    {editFormData.status === "refunded" && (
                    <div>
                        <label className="block text-sm font-bold text-brand-muted mb-1">İade Durumu</label>
                        <select className="w-full px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editFormData.refundStatus} onChange={(e) => setEditFormData({ ...editFormData, refundStatus: e.target.value })}>
                          <option value="">Normal İade</option>
                          <option value="14_gun_tam_iade">14 Gün %100 İade</option>
                        </select>
                        {editFormData.refundStatus === "14_gun_tam_iade" && (
                          <p className="text-xs text-purple-600 mt-1 font-medium">İlk 14 gün — öğrenci tam iade alır, mentor tamamladığı hafta kadar hakediş alır.</p>
                        )}
                    </div>
                    )}
                    <div className="md:col-span-2 flex items-center gap-3">
                      <input type="checkbox" id="sendMessage" checked={editFormData.sendMessage} onChange={(e) => setEditFormData({ ...editFormData, sendMessage: e.target.checked })} className="w-4 h-4 rounded border-brand-silver text-brand-primary focus:ring-brand-primary" />
                      <label htmlFor="sendMessage" className="text-sm font-bold text-brand-muted">Mesaj Gidecek</label>
                    </div>
                  </div>
                  <button type="submit" disabled={updating || editMentorSaving} className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-logo transition-all mt-4 shadow-lg shadow-brand-primary/20 disabled:opacity-70 flex items-center justify-center gap-2">
                    {updating || editMentorSaving ? (
                      <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{editMentorSaving ? "Mentor değiştiriliyor..." : "Güncelleniyor..."}</>
                    ) : "Güncelle"}
                  </button>
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
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Sınıf</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Mentor</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Veli</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Tarihler</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Durum</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Ödeme</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">İletişim</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Paket</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Kayıt</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-brand-muted uppercase tracking-widest">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-brand-silver/5">
                {students
                  .filter(student => {
                    if (!filters.paymentStatus || filters.paymentStatus === "paid" || filters.paymentStatus === "pending") return true
                    const ps = getEffectivePaymentStatus(student)
                    if (filters.paymentStatus === "late") return ps.label === "Gecikti"
                    if (filters.paymentStatus === "very_late") return ps.label === "Çok Gecikti"
                    return true
                  })
                  .map((student) => (
                  <tr key={student.id} className="hover:bg-brand-sand/30 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <a href={`/admin/students/${student.id}`} className="text-sm font-bold text-brand-dark hover:text-brand-logo transition-colors cursor-pointer">{student.name}</a>
                      <div className="text-xs text-brand-muted">{student.phone}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-muted">{student.email}</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="px-3 py-1 text-xs font-bold bg-brand-primary/10 text-brand-logo rounded-full">{student.grade}</span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-brand-logo">
                      {student.studentAssignments.length > 0 ? student.studentAssignments[0].mentor.name : "Atanmadı"}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm text-brand-dark">{student.parentName || "-"}</div>
                      <div className="text-xs text-brand-muted">{student.parentPhone || ""}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-[11px] text-brand-dark font-medium">
                      <div>{new Date(student.startDate).toLocaleDateString('tr-TR')}</div>
                      {student.endDate && <div className="text-brand-silver italic">{new Date(student.endDate).toLocaleDateString('tr-TR')} bitiş</div>}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${
                          student.status === "active" ? "bg-brand-primary/10 text-brand-logo border border-brand-primary/20" :
                          student.status === "dropped" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                        }`}>
                          {student.status === "active" ? "Aktif" : student.status === "dropped" ? "Bıraktı" : "İade"}
                        </span>
                        {student.refundStatus === "14_gun_tam_iade" && (
                          <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-purple-100 text-purple-700 w-fit">
                            14 Gün %100
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {(() => {
                        const ps = getEffectivePaymentStatus(student)
                        return <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${ps.style}`}>{ps.label}</span>
                      })()}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-[11px]">
	                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${
	                        student.contactPreference === "both" ? "bg-blue-100 text-blue-700" :
	                        student.contactPreference === "parent" ? "bg-purple-100 text-purple-700" :
	                        student.contactPreference === "student" ? "bg-brand-primary/10 text-brand-logo" :
	                        "bg-gray-100 text-gray-400"
	                      }`}>
	                        {student.contactPreference === "both" ? "Hem Öğr. Hem Veli" :
	                         student.contactPreference === "parent" ? "Veli" :
	                         student.contactPreference === "student" ? "Öğrenci" :
	                         "Belirtilmedi"}
	                      </span>
	                    </td>
	                                        <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${
                        student.packageType === "yks_kadar" ? "bg-indigo-100 text-indigo-700 border border-indigo-200" :
                        student.packageType === "1_aylik" ? "bg-cyan-100 text-cyan-700 border border-cyan-200" :
                        "bg-gray-100 text-gray-400"
                      }`}>
                        {student.packageType === "yks_kadar" ? "YKS'ye Kadar" :
                         student.packageType === "1_aylik" ? "1 Aylık" :
                         "Belirtilmedi"}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${
                        student.membershipType === "new" ? "bg-green-100 text-green-700" :
                        student.membershipType === "renewal" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-400"
                      }`}>
                        {student.membershipType === "new" ? "Yeni" :
                         student.membershipType === "renewal" ? "Yenileme" :
                         "Belirtilmedi"}
                      </span>
                    </td>
	                    <td className="px-6 py-5 whitespace-nowrap text-right space-x-3">
                      <button onClick={() => openEditForm(student)} className="text-brand-primary hover:text-brand-logo font-bold text-xs uppercase transition-colors">Düzenle</button>
                      {student.status === "active" && (
                        <button onClick={() => openExtendForm(student)} className="text-green-600 hover:text-green-800 font-bold text-xs uppercase transition-colors">Ek Süre</button>
                      )}
                      {(student.status === "dropped" || student.status === "refunded") && (
                        <button
                          onClick={() => handleReactivate(student.id, student.name)}
                          disabled={reactivating === student.id}
                          className="text-green-600 hover:text-green-800 font-bold text-xs uppercase transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {reactivating === student.id ? (
                            <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Aktifleştiriliyor...</>
                          ) : "Yeniden Aktifleştir"}
                        </button>
                      )}
                      <button onClick={() => handleDelete(student.id)} disabled={deletingId === student.id} className="text-red-400 hover:text-red-600 font-bold text-xs uppercase transition-colors disabled:opacity-50">
                        {deletingId === student.id ? "Siliniyor..." : "Sil"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {students.length === 0 && (
            <div className="text-center py-12 text-brand-silver font-medium italic">Öğrenci bulunamadı.</div>
          )}
          {totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-brand-silver/10 bg-brand-ghost">
              <p className="text-sm text-brand-muted">
                {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalCount)} / {totalCount} öğrenci
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-bold rounded-lg border border-brand-silver/30 bg-white text-brand-dark hover:bg-brand-sand transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Önceki
                </button>
                {Array.from({ length: Math.ceil(totalCount / PAGE_SIZE) }, (_, i) => i + 1).map((p) => (
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
                  onClick={() => setPage(p => Math.min(Math.ceil(totalCount / PAGE_SIZE), p + 1))}
                  disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
                  className="px-4 py-2 text-sm font-bold rounded-lg border border-brand-silver/30 bg-white text-brand-dark hover:bg-brand-sand transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Sonraki
                </button>
              </div>
            </div>
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
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {extendLoading ? (
                      <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Kaydediliyor...</>
                    ) : `${extendData.weeks} Hafta Ekle`}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
    </>
  );}