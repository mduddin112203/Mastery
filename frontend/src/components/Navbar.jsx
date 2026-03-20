/**
 * Reusable app navbar: public (logo + Log in / Sign up) or authenticated
 * (logo + main nav links + Profile, email, Log out).
 * Use inside a layout that provides routing (e.g. React Router).
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isAdminUser } from '../services/profileService'

const linkClass =
  'text-indigo-900/90 text-sm font-medium px-2 py-1.5 rounded-md hover:bg-indigo-100 transition-colors'

export default function Navbar() {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)

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

  if (loading) return null

  function handleLogout() {
    signOut()
    navigate('/', { replace: true })
  }

  const logo = (
    <img
      src="/main-logo.png"
      alt="Mastery"
      className="h-10 w-auto max-w-[140px] sm:h-12 sm:max-w-none"
      onError={(e) => { e.target.style.display = 'none' }}
    />
  )

  if (!user) {
    return (
      <header className="sticky top-0 z-10 border-b border-indigo-200 bg-indigo-50/90">
        <nav className="w-full px-4 sm:px-6 py-2.5 flex flex-wrap justify-between items-center gap-4">
          <Link to="/" className="flex items-center shrink-0 py-1.5" aria-label="Mastery home">
            {logo}
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link to="/login" className={`${linkClass} px-3`}>
              Log in
            </Link>
            <Link
              to="/signup"
              className="bg-indigo-600 text-white text-sm font-semibold px-4 py-1.5 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-10 border-b border-indigo-200 bg-indigo-50/90">
      <nav className="w-full px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <Link to="/home" className="flex items-center shrink-0 py-1.5" aria-label="Mastery home">
          {logo}
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link to="/home" className={linkClass}>
            Home
          </Link>
          <Link to="/practice" className={linkClass}>
            Practice
          </Link>
          <Link to="/progress" className={linkClass}>
            Progress
          </Link>
          <Link to="/profile" className={linkClass}>
            Profile
          </Link>
          {isAdmin && (
            <Link to="/admin" className={linkClass}>
              Admin
            </Link>
          )}
          <span className="hidden sm:inline text-indigo-300 text-sm mx-1">|</span>
          <span
            className="text-indigo-700/80 text-sm truncate max-w-[140px] sm:max-w-[200px]"
            title={user.email}
          >
            {user.email}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className={linkClass}
          >
            Log out
          </button>
        </div>
      </nav>
    </header>
  )
}
