"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Assignment {
  id: string
  startDate: string
  endDate: string | null
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

export default function AssignmentsPage() {
  const router = useRouter()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showChangeMentorForm, setShowChangeMentorForm] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState({
    studentId: "",
    mentorId: "",
    startDate: "",
    notes: ""
  })
  const [changeMentorData, setChangeMentorData] = useState({
    newMentorId: "",
    startDate: "",
    notes: ""
  })
  const [filters, setFilters] = useState({
    status: "",
    studentId: "",
    mentorId: ""
  })

  useEffect(() => {
    fetchAssignments()
    fetchStudents()
    fetchMentors()
  }, [filters])

  const fetchAssignments = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append("status", filters.status)
      if (filters.studentId) params.append("studentId", filters.studentId)
      if (filters.mentorId) params.append("mentorId", filters.mentorId)

      const res = await fetch(`/api/admin/assignments?${params.toString()}`)
      const data = await res.json()
      setAssignments(data)
    } catch (error) {
      console.error("Failed to fetch assignments:", error)
    } finally {
      setLoading(false)
    }
  }

  const [formError, setFormError] = useState<string | null>(null);

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
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setShowForm(false)
        setFormData({ studentId: "", mentorId: "", startDate: "", notes: "" })
        fetchAssignments()
      }
    } catch (error) {
      console.error("Failed to create assignment:", error)
    }
  }

  const handleEndAssignment = async (id: string) => {
    if (!confirm("Are you sure you want to end this assignment?")) return

    try {
      const res = await fetch(`/api/admin/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endDate: new Date().toISOString() })
      })

      if (res.ok) {
        fetchAssignments()
      }
    } catch (error) {
      console.error("Failed to end assignment:", error)
    }
  }

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Bu atamayı silmek istediğinize emin misiniz? İlişkili hakediş kayıtları da iptal edilecek.")) return

    try {
      const res = await fetch(`/api/admin/assignments/${id}`, {
        method: "DELETE"
      })

      if (res.ok) {
        fetchAssignments()
      } else {
        const data = await res.json()
        alert(data.error || "Silme işlemi başarısız oldu")
      }
    } catch (error) {
      console.error("Failed to delete assignment:", error)
      alert("Atama silinemedi.")
    }
  }

  const handleChangeMentor = async (e: React.FormEvent) => {
  e.preventDefault();
  setFormError(null); // Her denemede hatayı sıfırla

  try {
    const res = await fetch(`/api/admin/students/${selectedStudent!.id}/change-mentor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changeMentorData)
    });

    const data = await res.json();

    if (!res.ok) {
      // Backend'den gelen hata mesajını state'e aktar
      setFormError(data.error || "Bir hata oluştu");
      return;
    }

    // Başarılıysa formu kapat
    setShowChangeMentorForm(false);
    fetchAssignments();
  } catch (error) {
    setFormError("Sunucuya bağlanırken bir hata oluştu.");
  }
};

  const openChangeMentorForm = (assignment: Assignment) => {
    setSelectedStudent(assignment.student)
    setChangeMentorData({
      newMentorId: "",
      startDate: new Date().toISOString().split("T")[0],
      notes: ""
    })
    setShowChangeMentorForm(true)
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
          <h2 className="text-2xl font-bold text-brand-dark">Atamalar</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`${showForm ? 'bg-brand-muted' : 'bg-brand-logo'} text-white px-5 py-2 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-brand-logo/20`}
          >
            {showForm ? "Vazgeç" : "+ Yeni Atama"}
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
                <option value="ended">Sonlanmış</option>
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
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
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
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Yeni Atama Formu Modalı */}
{showForm && (
  <div className="fixed inset-0 bg-brand-dark/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-t-8 border-brand-logo">
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-brand-dark">Yeni Atama Oluştur</h3>
          <button 
            onClick={() => setShowForm(false)} 
            className="text-brand-silver hover:text-brand-dark text-2xl transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCreateSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Öğrenci *</label>
              <select
                required
                className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              >
                <option value="">Öğrenci Seçin</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>{student.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Mentor *</label>
              <select
                required
                className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={formData.mentorId}
                onChange={(e) => setFormData({ ...formData, mentorId: e.target.value })}
              >
                <option value="">Mentor Seçin</option>
                {mentors.map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>{mentor.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Başlangıç Tarihi *</label>
              <input
                type="date"
                required
                className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Notlar</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-brand-logo text-white py-4 rounded-xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand-logo/20"
            >
              Atamayı Tamamla
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
)}

        {/* Mentor Değiştirme Modalı */}
        {showChangeMentorForm && selectedStudent && (
          <div className="fixed inset-0 bg-brand-dark/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-t-8 border-brand-primary">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-brand-dark">{selectedStudent.name} İçin Mentor Değiştir</h3>
                  <button
                    onClick={() => {
                      setShowChangeMentorForm(false)
                      setSelectedStudent(null)
                    }}
                    className="text-brand-silver hover:text-brand-dark text-2xl transition-colors"
                  >
                    ✕
                  </button>
                </div>
                {formError && (
  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 animate-in shake duration-300">
    <div className="flex">
      <div className="shrink-0 text-xl">⚠️</div>
      <div className="ml-3">
        <p className="text-sm text-red-700 font-bold">{formError}</p>
      </div>
    </div>
  </div>
)}
                <form onSubmit={handleChangeMentor} className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-brand-muted mb-1.5">Yeni Mentor *</label>
                      <select
                        required
                        className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                        value={changeMentorData.newMentorId}
                        onChange={(e) => setChangeMentorData({ ...changeMentorData, newMentorId: e.target.value })}
                      >
                        <option value="">Mentor Seçin</option>
                        {mentors.map((mentor) => (
                          <option key={mentor.id} value={mentor.id}>
                            {mentor.name} ({mentor.specialty})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-brand-muted mb-1.5">Başlangıç Tarihi *</label>
                      <input
                        type="date"
                        required
                        className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                        value={changeMentorData.startDate}
                        onChange={(e) => setChangeMentorData({ ...changeMentorData, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-brand-muted mb-1.5">Notlar</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                        value={changeMentorData.notes}
                        onChange={(e) => setChangeMentorData({ ...changeMentorData, notes: e.target.value })}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-logo transition-all shadow-lg shadow-brand-primary/20"
                    >
                      Mentoru Güncelle
                    </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Atamalar Tablosu */}
<div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-brand-silver/10">
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-brand-silver/10">
      <thead className="bg-brand-ghost">
        <tr>
          <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Öğrenci</th>
          <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Mentor</th>
          <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Başlangıç</th>
          <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Bitiş</th>
          <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Durum</th>
          <th className="px-6 py-4 text-right text-xs font-black text-brand-muted uppercase tracking-widest">İşlemler</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-brand-silver/5">
        {assignments.map((assignment) => (
          <tr key={assignment.id} className="hover:bg-brand-sand/30 transition-colors">
            <td className="px-6 py-5">
              <div className="text-sm font-bold text-brand-dark">{assignment.student.name}</div>
              <div className="text-xs text-brand-muted">{assignment.student.email}</div>
              <div className="text-[10px] text-brand-silver mt-1">{assignment.student.school} - {assignment.student.grade}</div>
            </td>
            <td className="px-6 py-5">
              <div className="text-sm font-bold text-brand-logo">{assignment.mentor.name}</div>
              <div className="text-xs text-brand-muted">{assignment.mentor.specialty}</div>
            </td>
            <td className="px-6 py-5 text-sm font-medium text-brand-dark">
              {new Date(assignment.startDate).toLocaleDateString('tr-TR')}
            </td>
            <td className="px-6 py-5 text-sm font-medium text-brand-muted">
              {assignment.endDate
                ? new Date(assignment.endDate).toLocaleDateString('tr-TR')
                : "Devam Ediyor"}
            </td>
            <td className="px-6 py-5">
              <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider ${
                assignment.endDate ? "bg-brand-silver/20 text-brand-silver" : "bg-brand-primary/10 text-brand-logo border border-brand-primary/20"
              }`}>
                {assignment.endDate ? "Sonlandı" : "Aktif"}
              </span>
            </td>
            <td className="px-6 py-5 text-right">
              {!assignment.endDate ? (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => openChangeMentorForm(assignment)}
                    className="text-brand-primary hover:text-brand-logo font-bold text-xs uppercase transition-colors"
                  >
                    Mentor Değiştir
                  </button>
                  <button
                    onClick={() => handleEndAssignment(assignment.id)}
                    className="text-red-400 hover:text-red-600 font-bold text-xs uppercase transition-colors"
                  >
                    Bitir
                  </button>
                </div>
              ) : (
                /* Sonlananlar için Sil Butonu */
                <button
                  onClick={() => handleDeleteAssignment(assignment.id)}
                  className="text-brand-silver hover:text-red-500 font-bold text-xs uppercase transition-colors flex items-center gap-1 ml-auto justify-end"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Sil
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  {assignments.length === 0 && (
    <div className="text-center py-12 text-brand-silver font-medium italic">Henüz bir atama bulunamadı.</div>
  )}
</div>
      </div>
    </div>
  )}