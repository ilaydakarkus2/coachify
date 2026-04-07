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

export default function PaymentsPage() {
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [formData, setFormData] = useState({
    studentId: "",
    mentorId: "",
    userId: "",
    amount: "",
    weeks: "",
    status: "pending",
    notes: ""
  })
  const [editFormData, setEditFormData] = useState({
    amount: "",
    weeks: "",
    status: "",
    notes: ""
  })
  const [filters, setFilters] = useState({
    status: "",
    studentId: "",
    mentorId: "",
    startDate: "",
    endDate: ""
  })

  useEffect(() => {
    fetchPayments()
    fetchStudents()
    fetchMentors()
  }, [filters])

  const fetchPayments = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append("status", filters.status)
      if (filters.studentId) params.append("studentId", filters.studentId)
      if (filters.mentorId) params.append("mentorId", filters.mentorId)
      if (filters.startDate) params.append("startDate", filters.startDate)
      if (filters.endDate) params.append("endDate", filters.endDate)

      const res = await fetch(`/api/admin/payments?${params.toString()}`)
      const data = await res.json()
      setPayments(data)
    } catch (error) {
      console.error("Failed to fetch payments:", error)
    } finally {
      setLoading(false)
    }
  }

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
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setShowForm(false)
        setFormData({
          studentId: "",
          mentorId: "",
          userId: "",
          amount: "",
          weeks: "",
          status: "pending",
          notes: ""
        })
        fetchPayments()
      }
    } catch (error) {
      console.error("Failed to create payment:", error)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPayment) return

    try {
      const res = await fetch(`/api/admin/payments/${selectedPayment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData)
      })

      if (res.ok) {
        setShowEditForm(false)
        setSelectedPayment(null)
        fetchPayments()
      }
    } catch (error) {
      console.error("Failed to update payment:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete the payment record.")) return

    try {
      const res = await fetch(`/api/admin/payments/${id}`, {
        method: "DELETE"
      })

      if (res.ok) {
        fetchPayments()
      }
    } catch (error) {
      console.error("Failed to delete payment:", error)
    }
  }

  const handleRefund = async (payment: Payment) => {
    if (!confirm(`Are you sure you want to refund this payment of $${payment.amount}?`)) return

    try {
      const res = await fetch(`/api/admin/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "refunded" })
      })

      if (res.ok) {
        fetchPayments()
      }
    } catch (error) {
      console.error("Failed to refund payment:", error)
    }
  }

  const openEditForm = (payment: Payment) => {
    setSelectedPayment(payment)
    setEditFormData({
      amount: payment.amount.toString(),
      weeks: payment.weeks.toString(),
      status: payment.status,
      notes: payment.notes || ""
    })
    setShowEditForm(true)
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
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
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
              <Link href="/admin/logs" className="text-blue-600 hover:text-blue-800">
                Logs
              </Link>
              <button onClick={() => router.push("/login")} className="text-red-600 hover:text-red-800">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Payments</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            {showForm ? "Cancel" : "New Payment"}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.studentId}
                onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}
              >
                <option value="">All Students</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mentor</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.mentorId}
                onChange={(e) => setFilters({ ...filters, mentorId: e.target.value })}
              >
                <option value="">All Mentors</option>
                {mentors.map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Create Payment Form */}
        {showForm && (
          <form onSubmit={handleCreateSubmit} className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-4">Create New Payment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                >
                  <option value="">Select Student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mentor *</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.mentorId}
                  onChange={(e) => setFormData({ ...formData, mentorId: e.target.value })}
                >
                  <option value="">Select Mentor</option>
                  {mentors.map((mentor) => (
                    <option key={mentor.id} value={mentor.id}>
                      {mentor.name} ({mentor.specialty})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weeks *</label>
                <input
                  type="number"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.weeks}
                  onChange={(e) => setFormData({ ...formData, weeks: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                >
                  Create Payment
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Edit Payment Form Modal */}
        {showEditForm && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Edit Payment</h3>
                  <button
                    onClick={() => {
                      setShowEditForm(false)
                      setSelectedPayment(null)
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleEditSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editFormData.amount}
                        onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Weeks</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editFormData.weeks}
                        onChange={(e) => setEditFormData({ ...editFormData, weeks: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editFormData.notes}
                        onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                      >
                        Update Payment
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Payments Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mentor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weeks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payment.student.name}</div>
                      <div className="text-sm text-gray-500">{payment.student.email}</div>
                      <div className="text-xs text-gray-400">{payment.student.school} - {payment.student.grade}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payment.mentor.name}</div>
                      <div className="text-sm text-gray-500">{payment.mentor.specialty}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${payment.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.weeks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        payment.status === "paid" ? "bg-green-100 text-green-800" :
                        payment.status === "refunded" ? "bg-red-100 text-red-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => openEditForm(payment)}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                      >
                        Edit
                      </button>
                      {payment.status === "paid" && (
                        <button
                          onClick={() => handleRefund(payment)}
                          className="text-orange-600 hover:text-orange-900 mr-2"
                        >
                          Refund
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {payments.length === 0 && (
            <div className="text-center py-8 text-gray-500">No payments found</div>
          )}
        </div>
      </div>
    </div>
  )
}
