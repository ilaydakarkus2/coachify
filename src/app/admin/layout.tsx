import AdminNav from "@/components/AdminNav"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-brand-ghost">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  )
}
