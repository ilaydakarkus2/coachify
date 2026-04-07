"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Log {
  id: string
  entityType: string
  entityId: string
  action: string
  description: string
  createdAt: string
  metadata: any
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  student: {
    id: string
    name: string
    email: string
  } | null
}

export default function LogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<Log | null>(null)
  const [filters, setFilters] = useState({
    entityType: "",
    action: "",
    startDate: "",
    endDate: "",
    limit: "50"
  })

  useEffect(() => {
    fetchLogs()
  }, [filters])

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.entityType) params.append("entityType", filters.entityType)
      if (filters.action) params.append("action", filters.action)
      if (filters.startDate) params.append("startDate", filters.startDate)
      if (filters.endDate) params.append("endDate", filters.endDate)
      params.append("limit", filters.limit)

      const res = await fetch(`/api/admin/logs?${params.toString()}`)
      const data = await res.json()
      setLogs(data)
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = () => {
    setFilters({
      entityType: "",
      action: "",
      startDate: "",
      endDate: "",
      limit: "50"
    })
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
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Audit Logs</h2>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.entityType}
                onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              >
                <option value="">All Entities</option>
                <option value="student">Student</option>
                <option value="mentor">Mentor</option>
                <option value="assignment">Assignment</option>
                <option value="payment">Payment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              >
                <option value="">All Actions</option>
                <option value="created">Created</option>
                <option value="updated">Updated</option>
                <option value="deleted">Deleted</option>
                <option value="status_changed">Status Changed</option>
                <option value="mentor_changed">Mentor Changed</option>
                <option value="payment_processed">Payment Processed</option>
                <option value="refunded">Refunded</option>
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
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        log.entityType === "student" ? "bg-blue-100 text-blue-800" :
                        log.entityType === "mentor" ? "bg-purple-100 text-purple-800" :
                        log.entityType === "assignment" ? "bg-green-100 text-green-800" :
                        log.entityType === "payment" ? "bg-orange-100 text-orange-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {log.entityType}
                      </span>
                      {log.student && (
                        <div className="text-xs text-gray-500 mt-1">{log.student.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        log.action === "created" ? "bg-green-100 text-green-800" :
                        log.action === "updated" ? "bg-blue-100 text-blue-800" :
                        log.action === "deleted" ? "bg-red-100 text-red-800" :
                        log.action === "refunded" ? "bg-orange-100 text-orange-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{log.user.name}</div>
                      <div className="text-xs text-gray-500">{log.user.email}</div>
                      <div className="text-xs text-gray-400">{log.user.role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {logs.length === 0 && (
            <div className="text-center py-8 text-gray-500">No logs found</div>
          )}
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Log Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Entity Type</label>
                    <p className="text-gray-900">{selectedLog.entityType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Entity ID</label>
                    <p className="text-gray-900">{selectedLog.entityId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Action</label>
                    <p className="text-gray-900">{selectedLog.action}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date & Time</label>
                    <p className="text-gray-900">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900 mt-1">{selectedLog.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">User</label>
                  <div className="text-gray-900 mt-1">
                    {selectedLog.user.name} ({selectedLog.user.email}) - {selectedLog.user.role}
                  </div>
                </div>
                {selectedLog.student && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Student</label>
                    <div className="text-gray-900 mt-1">
                      {selectedLog.student.name} ({selectedLog.student.email})
                    </div>
                  </div>
                )}
                {selectedLog.metadata && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Metadata</label>
                    <pre className="mt-1 p-4 bg-gray-100 rounded-md overflow-x-auto text-sm">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
