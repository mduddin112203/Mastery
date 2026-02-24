import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: err } = await supabase.auth.signUp({ email, password })
    setSubmitting(false)
    if (err) {
      setError(err.message)
      return
    }
    navigate('/home', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[var(--mastery-bg)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <img src="/main-logo.png" alt="Mastery" className="h-16 w-auto mx-auto mb-8" />
        <div className="bg-white rounded-2xl border border-[var(--mastery-border)] shadow-sm p-6">
          <h1 className="text-xl font-semibold text-[var(--mastery-text)] mb-5">Sign up</h1>
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
                minLength={6}
                className="w-full border border-[var(--mastery-border)] rounded-xl px-3 py-2.5 text-[var(--mastery-text)] focus:ring-2 focus:ring-[var(--mastery-primary)] focus:border-transparent outline-none"
                placeholder="at least 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[var(--mastery-primary)] text-white font-semibold py-3 rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creating account…' : 'Sign up'}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account? <Link to="/login" className="text-[var(--mastery-primary)] font-medium hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
