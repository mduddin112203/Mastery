import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import BaseLayout from './components/BaseLayout'
import ProtectedLayout from './components/ProtectedLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import Onboarding from './pages/Onboarding'
import Practice from './pages/Practice'
import Behavioral from './pages/Behavioral'
import Progress from './pages/Progress'
import Profile from './pages/Profile'
import Admin from './pages/Admin'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<BaseLayout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
      </Route>
      <Route element={<ProtectedLayout />}>
        <Route path="home" element={<Home />} />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="practice" element={<Practice />} />
        <Route path="behavioral" element={<Behavioral />} />
        <Route path="progress" element={<Progress />} />
        <Route path="profile" element={<Profile />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}
