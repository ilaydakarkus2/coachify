"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Mentor {
  id: string
  name: string
  email: string
  specialty: string
  packages: Package[]
}

interface Package {
  id: string
  title: string
  price: number
  duration: number
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
      setMentors(data)
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

              {mentor.packages.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">Packages:</h4>
                  {mentor.packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      onClick={() => router.push(`/customer/create-invoice?mentorId=${mentor.id}&packageId=${pkg.id}`)}
                      className="border rounded p-3 cursor-pointer hover:bg-gray-50 transition"
                    >
                      <div className="font-medium">{pkg.title}</div>
                      <div className="text-sm text-gray-600">${pkg.price} - {pkg.duration} weeks</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No packages available</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}