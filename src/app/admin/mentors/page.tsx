"use client"

import { useState, useEffect } from "react"


interface Mentor {
  id: string
  name: string
  email: string
  specialty: string
  createdAt: string
  user?: {
    id: string
    email: string
    name: string
    role: string
    password: string
  }
}

export default function MentorsPage() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    specialty: ""
  })
  const [editingMentor, setEditingMentor] = useState<Mentor | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    password: "",
    specialty: ""
  })
  const [page, setPage] = useState(1)
  const [mentorSearch, setMentorSearch] = useState("")
  const [sortAsc, setSortAsc] = useState(true)
  const PAGE_SIZE = 20

  const filteredMentors = mentors
    .filter(m => !mentorSearch || m.name.toLowerCase().includes(mentorSearch.toLowerCase()))
    .sort((a, b) => sortAsc ? a.name.localeCompare(b.name, 'tr-TR') : b.name.localeCompare(a.name, 'tr-TR'))

  useEffect(() => {
    fetchMentors()
  }, [])

  const fetchMentors = async () => {
    try {
      const res = await fetch("/api/admin/mentors")
      const data = await res.json()
      setMentors(data)
    } catch (error) {
      console.error("Failed to fetch mentors:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/admin/mentors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setShowForm(false)
        setFormData({ name: "", email: "", password: "", specialty: "" })
        fetchMentors()
      }
    } catch (error) {
      console.error("Failed to create mentor:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Emin misiniz?")) return

    try {
      const res = await fetch(`/api/admin/mentors/${id}`, {
        method: "DELETE"
      })

      if (res.ok) {
        fetchMentors()
      }
    } catch (error) {
      console.error("Failed to delete mentor:", error)
    }
  }

  const openEditModal = (mentor: Mentor) => {
    setEditingMentor(mentor)
    setEditForm({
      name: mentor.name,
      email: mentor.email,
      password: mentor.user?.password || "",
      specialty: mentor.specialty
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMentor) return

    try {
      const res = await fetch(`/api/admin/mentors/${editingMentor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      })

      if (res.ok) {
        setEditingMentor(null)
        fetchMentors()
      } else {
        const data = await res.json()
        alert(data.error || "Guncelleme basarisiz")
      }
    } catch (error) {
      console.error("Failed to update mentor:", error)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-brand-dark">Mentorlar</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`${showForm ? 'bg-brand-muted' : 'bg-brand-logo'} text-white px-5 py-2 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-brand-logo/20`}
          >
            {showForm ? "Vazgec" : "+ Yeni Mentor"}
          </button>
        </div>

        {/* Yeni Mentor Ekleme Formu Modali */}
        {showForm && (
          <div className="fixed inset-0 bg-brand-dark/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-t-8 border-brand-logo">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-brand-dark">Yeni Mentor Ekle</h3>
                  <button onClick={() => setShowForm(false)} className="text-brand-silver hover:text-brand-dark text-2xl transition-colors">&#10005;</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-brand-muted mb-1">Ad Soyad *</label>
                    <input type="text" required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-brand-muted mb-1">E-posta *</label>
                    <input type="email" required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-brand-muted mb-1">Sifre *</label>
                    <input type="text" required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-brand-muted mb-1">Brans *</label>
                    <input type="text" required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} />
                  </div>
                  <button type="submit" className="w-full bg-brand-logo text-white py-3 rounded-xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand-logo/20">Mentoru Kaydet</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Mentor Duzenleme Modali */}
        {editingMentor && (
          <div className="fixed inset-0 bg-brand-dark/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-t-8 border-brand-primary">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-brand-dark">Mentor Duzenle</h3>
                  <button onClick={() => setEditingMentor(null)} className="text-brand-silver hover:text-brand-dark text-2xl transition-colors">&#10005;</button>
                </div>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-brand-muted mb-1">Ad Soyad</label>
                    <input type="text" required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-brand-muted mb-1">E-posta</label>
                    <input type="email" required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-brand-muted mb-1">Sifre</label>
                    <input type="text" className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-brand-muted mb-1">Brans</label>
                    <input type="text" required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={editForm.specialty} onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })} />
                  </div>
                  <button type="submit" className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand-primary/20">Guncelle</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Mentorlar Tablosu */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-brand-silver/10">
          {/* Arama ve Sıralama */}
          <div className="px-6 py-4 border-b border-brand-silver/10 flex items-center gap-4">
            <input
              type="text"
              placeholder="Mentor ara..."
              value={mentorSearch}
              onChange={(e) => { setMentorSearch(e.target.value); setPage(1) }}
              className="flex-1 px-3 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none text-sm"
            />
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="px-4 py-2 text-sm font-bold rounded-lg border border-brand-silver/30 bg-white text-brand-dark hover:bg-brand-sand transition-all whitespace-nowrap"
            >
              {sortAsc ? "A → Z" : "Z → A"}
            </button>
          </div>
          <table className="min-w-full divide-y divide-brand-silver/10">
            <thead className="bg-brand-ghost">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Ad Soyad</th>
                <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">E-posta</th>
                <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Sifre</th>
                <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Brans</th>
                <th className="px-6 py-4 text-right text-xs font-black text-brand-muted uppercase tracking-widest">Islemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-silver/5">
              {filteredMentors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((mentor) => (
                <tr key={mentor.id} className="hover:bg-brand-sand/30 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm font-bold text-brand-dark">{mentor.name}</div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm text-brand-muted">{mentor.email}</div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap font-mono text-xs text-brand-silver italic">
                    {mentor.user?.password || 'Belirtilmedi'}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="px-3 py-1 text-xs font-bold bg-brand-primary/10 text-brand-logo rounded-full">
                      {mentor.specialty}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openEditModal(mentor)}
                        className="text-brand-primary hover:text-brand-dark font-bold text-xs uppercase tracking-tighter transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        DUZENLE
                      </button>
                      <button
                        onClick={() => handleDelete(mentor.id)}
                        className="text-red-400 hover:text-red-600 font-bold text-xs uppercase tracking-tighter transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        SIL
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMentors.length === 0 && (
            <div className="text-center py-12 text-brand-silver font-medium italic">
              {mentorSearch ? "Aramanızla eşleşen mentor bulunamadı." : "Henuz kayitli mentor bulunmuyor."}
            </div>
          )}
          {filteredMentors.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-brand-silver/10 bg-brand-ghost">
              <p className="text-sm text-brand-muted">
                {((page - 1) * PAGE_SIZE) + 1}&ndash;{Math.min(page * PAGE_SIZE, filteredMentors.length)} / {filteredMentors.length} mentor
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-bold rounded-lg border border-brand-silver/30 bg-white text-brand-dark hover:bg-brand-sand transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Onceki
                </button>
                {Array.from({ length: Math.ceil(filteredMentors.length / PAGE_SIZE) }, (_, i) => i + 1).map((p) => (
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
                  onClick={() => setPage(p => Math.min(Math.ceil(filteredMentors.length / PAGE_SIZE), p + 1))}
                  disabled={page >= Math.ceil(filteredMentors.length / PAGE_SIZE)}
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
