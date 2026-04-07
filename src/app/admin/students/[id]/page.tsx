"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Assignment {
  id: string
  startDate: string
  endDate: string | null
  notes: string | null
  mentor: {
    id: string
    name: string
    email: string
    specialty: string
  }
}

interface Payment {
  id: string
  amount: number
  weeks: number
  paymentDate: string
  status: string
  notes: string | null
  mentor: {
    id: string
    name: string
    email: string
  }
}

interface Log {
  id: string
  entityType: string
  action: string
  description: string
  createdAt: string
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
  phone: string
  school: string
  grade: string
  startDate: string
  endDate: string | null
  status: string
  paymentStatus: string
  packageDuration: number
  studentAssignments: Assignment[]
  payments: Payment[]
  logs: Log[]
}

export default function StudentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStudent()
  }, [params.id])

  const fetchStudent = async () => {
    try {
      const res = await fetch(`/api/admin/students/${params.id}`)
      const data = await res.json()
      setStudent(data)
    } catch (error) {
      console.error("Failed to fetch student:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!student) {
    return <div className="p-8">Student not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/admin/students" className="text-blue-600 hover:text-blue-800">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
            </div>
            <div className="flex gap-4">
              <Link href="/admin/mentors" className="text-blue-600 hover:text-blue-800">
                Mentors
              </Link>
              <Link href="/admin/assignments" className="text-blue-600 hover:text-blue-800">
                Assignments
              </Link>
              <Link href="/admin/payments" className="text-blue-600 hover:text-blue-800">
                Payments
              </Link>
              <button onClick={() => router.push("/login")} className="text-red-600 hover:text-red-800">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Student Info Card */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{student.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <p className="text-gray-900">{student.phone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">School</label>
              <p className="text-gray-900">{student.school}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Grade</label>
              <p className="text-gray-900">{student.grade}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                student.status === "active" ? "bg-green-100 text-green-800" :
                student.status === "dropped" ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800"
              }`}>
                {student.status}
              </span>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Payment Status</label>
              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                student.paymentStatus === "paid" ? "bg-green-100 text-green-800" :
                student.paymentStatus === "refunded" ? "bg-red-100 text-red-800" :
                "bg-yellow-100 text-yellow-800"
              }`}>
                {student.paymentStatus}
              </span>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Start Date</label>
              <p className="text-gray-900">{new Date(student.startDate).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">End Date</label>
              <p className="text-gray-900">
                {student.endDate ? new Date(student.endDate).toLocaleDateString() : "Ongoing"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Package Duration</label>
              <p className="text-gray-900">{student.packageDuration} weeks</p>
            </div>
          </div>
        </div>

        {/* Assignment History */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment History</h2>
          {student.studentAssignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mentor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Specialty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {student.studentAssignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {assignment.mentor.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {assignment.mentor.specialty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(assignment.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {assignment.endDate
                          ? new Date(assignment.endDate).toLocaleDateString()
                          : "Ongoing"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          assignment.endDate ? "bg-gray-100 text-gray-800" : "bg-green-100 text-green-800"
                        }`}>
                          {assignment.endDate ? "Ended" : "Active"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No assignments found</p>
          )}
        </div>

        {/* Payment History */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h2>
          {student.payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {student.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.mentor.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No payments found</p>
          )}
        </div>

        {/* Activity Log */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h2>
          {student.logs.length > 0 ? (
            <div className="space-y-4">
              {student.logs.map((log) => (
                <div key={log.id} className="border-l-2 border-blue-500 pl-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-900">{log.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        By {log.user.name} ({log.user.role}) • {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                      {log.action}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No activity logs found</p>
          )}
        </div>
      </div>
    </div>
  )
}
