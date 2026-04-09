"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

const NAV_ITEMS = [
  { href: "/admin", label: "Panel", exact: true },
  { href: "/admin/students", label: "Öğrenciler" },
  { href: "/admin/mentors", label: "Mentorlar" },
  { href: "/admin/assignments", label: "Atamalar" },
  { href: "/admin/mentor-earnings", label: "Kazançlar" },
  { href: "/admin/logs", label: "Kayıtlar" },
]

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href) && pathname !== "/admin"

  return (
    <nav className="bg-brand-dark shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <Link href="/admin" className="flex-shrink-0">
            <h1 className="text-xl font-black tracking-tight">
              <span className="text-white">Coachify</span>
              <span className="text-brand-primary ml-1">Admin</span>
            </h1>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    active
                      ? "bg-brand-primary/20 text-brand-primary"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
            <button
              onClick={() => router.push("/login")}
              className="ml-3 bg-red-500/20 hover:bg-red-500/40 text-red-300 hover:text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200"
            >
              Çıkış
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Menü"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-brand-dark">
          <div className="px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    active
                      ? "bg-brand-primary/20 text-brand-primary"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
            <button
              onClick={() => { setMobileOpen(false); router.push("/login") }}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold text-red-300 hover:bg-red-500/20 transition-all"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
