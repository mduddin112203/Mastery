import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'

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
        <nav className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex justify-between items-center gap-4">
          <Link to="/" className="flex items-center shrink-0">
            <img src="/main-logo.png" alt="Mastery" className="h-14 w-auto sm:h-16" />
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
      <nav className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex justify-between items-center gap-4">
        <Link to="/home" className="flex items-center shrink-0">
          <img src="/main-logo.png" alt="Mastery" className="h-14 w-auto sm:h-16" />
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

function AppRoutes() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}
