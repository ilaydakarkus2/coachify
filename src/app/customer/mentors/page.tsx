"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Mentor {
  id: string
  name: string
  email: string
  specialty: string
  user?: {
    id: string
    email: string
    name: string
    role: string
  }
}

export default function MentorsPage() {
  const router = useRouter()
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMentors()
  }, [])

  const fetchMentors = async () => {
    try {
      const res = await fetch("/api/customer/mentors")
      const data = await res.json()

      console.log("Mentors data:", data)

      if (Array.isArray(data)) {
        setMentors(data)
      } else if (data.error) {
        console.error("API error:", data.error)
      } else {
        console.error("Unexpected data format:", data)
      }
    } catch (error) {
      console.error("Failed to fetch mentors:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Customer Dashboard</h1>
            <div className="flex gap-4">
              <Link href="/customer/create-invoice" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Create Invoice
              </Link>
              <Link href="/customer/invoices" className="text-blue-600 hover:text-blue-800">
                My Invoices
              </Link>
              <button onClick={() => router.push("/login")} className="text-red-600 hover:text-red-800">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Mentors</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentors.map((mentor) => (
            <div key={mentor.id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{mentor.name}</h3>
              <p className="text-gray-600 mb-1">{mentor.email}</p>
              <p className="text-gray-600 mb-4">{mentor.specialty}</p>

              <div className="text-sm text-gray-500">
                Role: {mentor.user?.role || 'N/A'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}