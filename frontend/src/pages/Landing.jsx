import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Landing() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--mastery-bg)] flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen bg-[var(--mastery-bg)] flex flex-col items-center justify-center px-6">
        <img src="/main-logo.png" alt="Mastery" className="h-20 w-auto" />
        <p className="mt-4 text-slate-600">Daily practice for tech interviews</p>
        <Link
          to="/home"
          className="mt-8 inline-flex items-center gap-2 text-[var(--mastery-primary)] font-semibold hover:underline"
        >
          Go to home
          <span aria-hidden>→</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--mastery-bg)] flex flex-col">
      <div className="bg-gradient-to-br from-[#4F46E5] to-indigo-600 flex-1 flex flex-col justify-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <div className="flex flex-col items-center text-center">
            <img
              src="/main-logo.png"
              alt="Mastery"
              className="h-32 sm:h-40 w-auto brightness-0 invert contrast-110 drop-shadow-md"
            />
            <h1 className="mt-8 text-3xl sm:text-4xl font-bold text-white leading-tight">
              Master Tech Interviews,<br />5 Minutes a Day
            </h1>
            <p className="mt-3 text-base sm:text-lg text-indigo-100 max-w-lg">
              Daily practice in code, system design, and behavioral—so you stay interview-ready without the cramming.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-[#4F46E5] font-semibold hover:bg-gray-100 transition-colors min-h-[48px]"
              >
                Start free today
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl border-2 border-white bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors min-h-[48px]"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--mastery-border)] bg-white py-6">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-[var(--mastery-text)] text-sm">
            Three cards per day—code, system design, behavioral. About 5–8 minutes. Build the habit.
          </p>
        </div>
      </div>

      <footer className="bg-[#0F172A] text-slate-400 py-5">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center text-xs">
          <p>© 2026 Mastery</p>
          <p className="mt-1">Md Uddin, Josh Marquez, Mahfuz Zaman, Shadman Uddin, Wilbert Carvajal</p>
        </div>
      </footer>
    </div>
  )
}
