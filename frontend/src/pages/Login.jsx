import { useState, useEffect } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'
import { hasUserProfile } from '../services/profileService'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading || !user?.id) return
    let cancelled = false
    hasUserProfile(user.id).then((ok) => {
      if (!cancelled) navigate(ok ? '/home' : '/onboarding', { replace: true })
    })
    return () => { cancelled = true }
  }, [loading, user?.id, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (err) {
      if (err.message && err.message.toLowerCase().includes('email not confirmed')) {
        setError('Email not confirmed yet. Check your inbox for the confirmation link, then try again.')
      } else {
        setError(err.message)
      }
      return
    }
    const profileOk = data?.user?.id ? await hasUserProfile(data.user.id) : false
    navigate(profileOk ? '/home' : '/onboarding', { replace: true })
  }

  if (!loading && user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--mastery-bg)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <div className="bg-white rounded-2xl border border-[var(--mastery-border)] shadow-sm p-6">
          <h1 className="text-xl font-semibold text-[var(--mastery-text)] mb-5">Log in</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--mastery-text)] mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-[var(--mastery-border)] rounded-xl px-3 py-2.5 text-[var(--mastery-text)] focus:ring-2 focus:ring-[var(--mastery-primary)] focus:border-transparent outline-none"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--mastery-text)] mb-1.5">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-[var(--mastery-border)] rounded-xl px-3 py-2.5 text-[var(--mastery-text)] focus:ring-2 focus:ring-[var(--mastery-primary)] focus:border-transparent outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[var(--mastery-primary)] text-white font-semibold py-3 rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500">
            No account? <Link to="/signup" className="text-[var(--mastery-primary)] font-medium hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
