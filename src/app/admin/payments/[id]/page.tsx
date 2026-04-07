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
    paymentStatus: string
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

export default function PaymentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayment()
  }, [params.id])

  const fetchPayment = async () => {
    try {
      const res = await fetch(`/api/admin/payments/${params.id}`)
      const data = await res.json()
      setPayment(data)
    } catch (error) {
      console.error("Failed to fetch payment:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async () => {
    if (!confirm(`Are you sure you want to refund this payment of $${payment?.amount}?`)) return

    try {
      const res = await fetch(`/api/admin/payments/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "refunded" })
      })

      if (res.ok) {
        fetchPayment()
      }
    } catch (error) {
      console.error("Failed to refund payment:", error)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!payment) {
    return <div className="p-8">Payment not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/admin/payments" className="text-blue-600 hover:text-blue-800">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Payment Details</h1>
            </div>
            <div className="flex gap-4">
              <Link href="/admin/mentors" className="text-blue-600 hover:text-blue-800">
                Mentors
              </Link>
              <Link href="/admin/students" className="text-blue-600 hover:text-blue-800">
                Students
              </Link>
              <Link href="/admin/assignments" className="text-blue-600 hover:text-blue-800">
                Assignments
              </Link>
              <button onClick={() => router.push("/login")} className="text-red-600 hover:text-red-800">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Payment Info Card */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Payment Information</h2>
            <div className="flex gap-2">
              {payment.status === "paid" && (
                <button
                  onClick={handleRefund}
                  className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
                >
                  Refund Payment
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Amount</label>
              <p className="text-2xl font-bold text-gray-900">${payment.amount.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <span className={`ml-2 px-3 py-1 text-sm rounded-full ${
                payment.status === "paid" ? "bg-green-100 text-green-800" :
                payment.status === "refunded" ? "bg-red-100 text-red-800" :
                "bg-yellow-100 text-yellow-800"
              }`}>
                {payment.status.toUpperCase()}
              </span>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Payment Date</label>
              <p className="text-gray-900">{new Date(payment.paymentDate).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Weeks</label>
              <p className="text-gray-900">{payment.weeks}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Weekly Rate</label>
              <p className="text-gray-900">${(payment.amount / payment.weeks).toFixed(2)}/week</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Notes</label>
              <p className="text-gray-900">{payment.notes || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Student Information */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-gray-900">{payment.student.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{payment.student.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">School</label>
              <p className="text-gray-900">{payment.student.school}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Grade</label>
              <p className="text-gray-900">{payment.student.grade}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Student Status</label>
              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                payment.student.status === "active" ? "bg-green-100 text-green-800" :
                payment.student.status === "dropped" ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800"
              }`}>
                {payment.student.status}
              </span>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Payment Status</label>
              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                payment.student.paymentStatus === "paid" ? "bg-green-100 text-green-800" :
                payment.student.paymentStatus === "refunded" ? "bg-red-100 text-red-800" :
                "bg-yellow-100 text-yellow-800"
              }`}>
                {payment.student.paymentStatus}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <Link
              href={`/admin/students/${payment.student.id}`}
              className="text-blue-600 hover:text-blue-800"
            >
              View Full Student Profile →
            </Link>
          </div>
        </div>

        {/* Mentor Information */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mentor Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-gray-900">{payment.mentor.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{payment.mentor.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Specialty</label>
              <p className="text-gray-900">{payment.mentor.specialty}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/admin/mentors"
              className="text-blue-600 hover:text-blue-800"
            >
              View All Mentors →
            </Link>
          </div>
        </div>

        {/* User Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Processed By</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-gray-900">{payment.user.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{payment.user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Role</label>
              <p className="text-gray-900">{payment.user.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
