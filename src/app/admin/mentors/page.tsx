"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

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
    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-t-8 border-brand-logo">
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-brand-dark">Yeni Mentor Kaydı</h3>
          <button 
            onClick={() => setShowForm(false)} 
            className="text-brand-silver hover:text-brand-dark text-2xl transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">İsim Soyisim *</label>
              <input
                type="text"
                required
                placeholder="Örn: Ahmet Yılmaz"
                className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">E-posta Adresi *</label>
              <input
                type="email"
                required
                placeholder="ahmet@example.com"
                className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Şifre *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-muted mb-1.5">Uzmanlık Alanı (Branş) *</label>
              <input
                type="text"
                required
                placeholder="Örn: Matematik, Fizik"
                className="w-full px-4 py-2 border border-brand-silver rounded-lg focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              />
            </div>
          </div>
          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-brand-logo text-white py-4 rounded-xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand-logo/20"
            >
              Mentoru Kaydet ve Tamamla
            </button>
          </div>
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
              {mentors.map((mentor) => (
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
        </div>
      </div>
    </div>
  )
}