"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

interface Mentor {
  id: string
  name: string
}

interface Package {
  id: string
  title: string
  price: number
  mentor: Mentor
}

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <CreateInvoiceContent />
    </Suspense>
  )
}

function CreateInvoiceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    mentorId: searchParams.get("mentorId") || "",
    packageId: searchParams.get("packageId") || "",
    amount: ""
  })

  useEffect(() => {
    fetchMentors()
    if (formData.mentorId) {
      fetchPackages(formData.mentorId)
    }
  }, [])

  useEffect(() => {
    if (formData.packageId) {
      const selectedPackage = packages.find(p => p.id === formData.packageId)
      if (selectedPackage) {
        setFormData(prev => ({ ...prev, amount: selectedPackage.price.toString() }))
      }
    }
  }, [formData.packageId, packages])

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

  const fetchPackages = async (mentorId: string) => {
    try {
      const res = await fetch(`/api/customer/mentors/${mentorId}/packages`)
      const data = await res.json()
      setPackages(data)
    } catch (error) {
      console.error("Failed to fetch packages:", error)
    }
  }

  const handleMentorChange = (mentorId: string) => {
    setFormData({ ...formData, mentorId, packageId: "", amount: "" })
    if (mentorId) {
      fetchPackages(mentorId)
    } else {
      setPackages([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/customer/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorId: formData.mentorId,
          packageId: formData.packageId || null,
          amount: parseFloat(formData.amount)
        })
      })

      if (res.ok) {
        router.push("/customer/invoices")
      }
    } catch (error) {
      console.error("Failed to create invoice:", error)
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
              <Link href="/customer/mentors" className="text-blue-600 hover:text-blue-800">
                Mentors
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
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Create Invoice</h2>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow max-w-2xl">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mentor</label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.mentorId}
                onChange={(e) => handleMentorChange(e.target.value)}
              >
                <option value="">Select a mentor</option>
                {mentors.map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package (Optional)</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.packageId}
                onChange={(e) => setFormData({ ...formData, packageId: e.target.value })}
                disabled={!formData.mentorId}
              >
                <option value="">Select a package or leave empty for custom amount</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.title} - ${pkg.price}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                required
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
            >
              Create Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}