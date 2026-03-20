import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hasUserProfile } from '../services/profileService'

/**
 * Requires user to have completed profile (user_settings) before accessing app routes.
 * Only /onboarding is allowed without a profile.
 */
export default function ProfileGate({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  const [hasProfile, setHasProfile] = useState(null)

  const isOnboarding = location.pathname === '/onboarding'

  useEffect(() => {
    if (!user?.id) {
      // Defer state update to avoid react-hooks lint complaints about cascading renders.
      queueMicrotask(() => setHasProfile(null))
      return
    }
    if (isOnboarding) {
      // Defer state update to avoid react-hooks lint complaints about cascading renders.
      queueMicrotask(() => setHasProfile(true))
      return
    }
    let cancelled = false
    hasUserProfile(user.id).then((ok) => {
      if (!cancelled) setHasProfile(ok)
    })
    return () => { cancelled = true }
  }, [user?.id, isOnboarding])

  if (!user) return children

  if (isOnboarding) return children

  if (hasProfile === null) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    )
  }

  if (!hasProfile) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />
  }

  return children
}
