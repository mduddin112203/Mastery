import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

function getParamsFromUrl(location) {
  const searchParams = new URLSearchParams(location.search)
  const hashParams = new URLSearchParams((location.hash || '').replace(/^#/, ''))
  return { searchParams, hashParams }
}

function getFirstParam(location, key) {
  const { searchParams, hashParams } = getParamsFromUrl(location)
  return searchParams.get(key) || hashParams.get(key)
}

function getTokenHashFromUrl(location) {
  // Supabase often uses `token` containing the token hash in the verification URL.
  // Handle common variants just in case.
  return (
    getFirstParam(location, 'token_hash')
    || getFirstParam(location, 'tokenHash')
    || getFirstParam(location, 'token')
  )
}

function getSessionTokensFromUrl(location) {
  const accessToken = getFirstParam(location, 'access_token')
  const refreshToken = getFirstParam(location, 'refresh_token')
  if (!accessToken || !refreshToken) return null
  return { access_token: accessToken, refresh_token: refreshToken }
}

export default function UpdatePassword() {
  const location = useLocation()
  const navigate = useNavigate()

  const tokenHash = useMemo(() => getTokenHashFromUrl(location), [location])
  const sessionTokens = useMemo(() => getSessionTokensFromUrl(location), [location])

  const [verifying, setVerifying] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    let cancelled = false

    async function run() {
      setVerifying(true)
      setError('')
      setVerified(false)

      // Case 1: Supabase already established a session (common after clicking the email link).
      const { data: sessionData } = await supabase.auth.getSession()
      if (!cancelled && sessionData?.session?.user) {
        setVerified(true)
        setVerifying(false)
        return
      }

      // Case 2: Supabase redirected back with tokens in URL (fragment/hash).
      if (sessionTokens) {
        await supabase.auth.setSession(sessionTokens)
        if (cancelled) return
        setVerified(true)
        setVerifying(false)
        return
      }

      // Case 3: We only have the recovery token hash; verify it to create a session.
      if (!tokenHash) {
        setError('Missing password reset token. Please request a new reset link.')
        setVerified(false)
        setVerifying(false)
        return
      }

      const { data, error: err } = await supabase.auth.verifyOtp({
        type: 'recovery',
        token_hash: tokenHash,
      })

      if (cancelled) return

      if (err) {
        setError(err.message)
        setVerified(false)
        setVerifying(false)
        return
      }

      // Ensure we have an active session so updateUser({ password }) works.
      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
      }

      setVerified(true)
      setVerifying(false)
    }

    run()
    return () => {
      cancelled = true
    }
  }, [tokenHash, sessionTokens])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { error: err } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setSubmitting(false)
    if (err) {
      setError(err.message)
      return
    }

    navigate('/login', { replace: true, state: { passwordUpdated: true } })
  }

  return (
    <div className="min-h-screen bg-[var(--mastery-bg)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <div className="bg-white rounded-2xl border border-[var(--mastery-border)] shadow-sm p-6">
          <h1 className="text-xl font-semibold text-[var(--mastery-text)] mb-3">Set a new password</h1>

          {verifying ? (
            <p className="text-sm text-slate-600">Validating reset link…</p>
          ) : error ? (
            <>
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
              <p className="mt-4 text-sm text-slate-500">
                <Link to="/forgot-password" className="text-[var(--mastery-primary)] font-medium hover:underline">
                  Request a new link
                </Link>
              </p>
            </>
          ) : (
            verified && (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-[var(--mastery-text)] mb-1.5">
                      New password
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                    {submitting ? 'Updating…' : 'Update password'}
                  </button>
                </form>

                <p className="mt-4 text-sm text-slate-500">
                  Remembered it?{' '}
                  <Link to="/login" className="text-[var(--mastery-primary)] font-medium hover:underline">
                    Log in
                  </Link>
                </p>
              </>
            )
          )}
        </div>
      </div>
    </div>
  )
}

