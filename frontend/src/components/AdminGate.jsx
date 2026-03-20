import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isAdminUser } from '../services/profileService'

export default function AdminGate({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  const [isAdmin, setIsAdmin] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!user?.id) {
      // Defer state update to avoid react-hooks lint complaints about cascading renders.
      queueMicrotask(() => setIsAdmin(false))
      return () => { cancelled = true }
    }

    isAdminUser(user.id).then((ok) => {
      if (!cancelled) setIsAdmin(ok)
    })

    return () => { cancelled = true }
  }, [user?.id])

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-indigo-50/50 flex items-center justify-center">
        <p className="text-indigo-700/80">Checking admin access…</p>
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/home" state={{ from: location }} replace />
  }

  return children
}

