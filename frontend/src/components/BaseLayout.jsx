import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Nav() {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()

  if (loading) return null

  function handleLogout() {
    signOut()
    navigate('/', { replace: true })
  }

  if (!user) {
    return (
      <header className="sticky top-0 z-10 border-b border-[var(--mastery-border)] bg-white">
        <nav className="w-full px-4 sm:px-6 py-2.5 flex justify-between items-center gap-4">
          <Link to="/" className="flex items-center shrink-0 py-1.5">
            <img src="/main-logo.png" alt="Mastery" className="h-10 w-auto sm:h-12" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-[var(--mastery-text)] text-sm font-medium px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="bg-[var(--mastery-primary)] text-white text-sm font-semibold px-4 py-1.5 rounded-md hover:bg-indigo-600 transition-colors"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--mastery-border)] bg-white">
      <nav className="w-full px-4 sm:px-6 py-2.5 flex justify-between items-center gap-4">
        <Link to="/home" className="flex items-center shrink-0 py-1.5">
          <img src="/main-logo.png" alt="Mastery" className="h-10 w-auto sm:h-12" />
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="text-slate-600 hover:text-[var(--mastery-text)] text-sm font-medium px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
        >
          Log out
        </button>
      </nav>
    </header>
  )
}

export default function BaseLayout() {
  return (
    <>
      <Nav />
      <Outlet />
    </>
  )
}
