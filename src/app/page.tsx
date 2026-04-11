import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-72 h-72 bg-brand-primary rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-brand-logo rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-md w-full text-center px-4">
        <h1 className="text-5xl font-black tracking-tight text-white mb-3">
          Coachify
        </h1>
        <p className="text-brand-primary font-bold text-lg mb-10">
          Mentor Payment Panel
        </p>

        <Link
          href="/login"
          className="inline-block w-full bg-brand-logo text-white py-4 px-6 rounded-2xl font-bold text-lg hover:bg-brand-primary transition-all shadow-lg shadow-brand-logo/30"
        >
          Giriş Yap
        </Link>
      </div>
    </div>
  )
}
