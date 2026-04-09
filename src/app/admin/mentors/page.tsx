"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminNav from "@/components/AdminNav"

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
  const router = useRouter()
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    specialty: ""
  })
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

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
    if (!confirm("Are you sure?")) return

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

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

 return (
    <div className="min-h-screen bg-brand-ghost">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-brand-dark">Mentorlar</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`${showForm ? 'bg-brand-muted' : 'bg-brand-logo'} text-white px-5 py-2 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-brand-logo/20`}
          >
            {showForm ? "Vazgeç" : "+ Yeni Mentor"}
          </button>
        </div>

        {/* Yeni Mentor Ekleme Formu Modalı */}
{showForm && (
  <div className="fixed inset-0 bg-brand-dark/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-t-8 border-brand-logo">
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-brand-dark">Yeni Mentor Ekle</h3>
          <button onClick={() => setShowForm(false)} className="text-brand-silver hover:text-brand-dark text-2xl transition-colors">✕</button>
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
            <label className="block text-sm font-bold text-brand-muted mb-1">Şifre *</label>
            <input type="text" required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-bold text-brand-muted mb-1">Branş *</label>
            <input type="text" required className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} />
          </div>
          <button type="submit" className="w-full bg-brand-logo text-white py-3 rounded-xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand-logo/20">Mentoru Kaydet</button>
        </form>
      </div>
    </div>
  </div>
)}

        {/* Mentorlar Tablosu */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-brand-silver/10">
          <table className="min-w-full divide-y divide-brand-silver/10">
            <thead className="bg-brand-ghost">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Ad Soyad</th>
                <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">E-posta</th>
                <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Şifre</th>
                <th className="px-6 py-4 text-left text-xs font-black text-brand-muted uppercase tracking-widest">Branş</th>
                <th className="px-6 py-4 text-right text-xs font-black text-brand-muted uppercase tracking-widest">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-silver/5">
              {mentors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((mentor) => (
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
                    <button
                      onClick={() => handleDelete(mentor.id)}
                      className="text-red-400 hover:text-red-600 font-bold text-xs uppercase tracking-tighter transition-colors flex items-center gap-1 ml-auto"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      SİL
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {mentors.length === 0 && (
            <div className="text-center py-12 text-brand-silver font-medium italic">
              Henüz kayıtlı mentor bulunmuyor.
            </div>
          )}
          {mentors.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-brand-silver/10 bg-brand-ghost">
              <p className="text-sm text-brand-muted">
                {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, mentors.length)} / {mentors.length} mentor
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-bold rounded-lg border border-brand-silver/30 bg-white text-brand-dark hover:bg-brand-sand transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Önceki
                </button>
                {Array.from({ length: Math.ceil(mentors.length / PAGE_SIZE) }, (_, i) => i + 1).map((p) => (
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
                  onClick={() => setPage(p => Math.min(Math.ceil(mentors.length / PAGE_SIZE), p + 1))}
                  disabled={page >= Math.ceil(mentors.length / PAGE_SIZE)}
                  className="px-4 py-2 text-sm font-bold rounded-lg border border-brand-silver/30 bg-white text-brand-dark hover:bg-brand-sand transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}