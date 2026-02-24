import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <img src="/main-logo.png" alt="Mastery" className="h-14 w-auto mb-6" />
        <p className="mt-2 text-slate-600">Daily practice for tech interviews</p>
        {user && (
          <p className="mt-4 text-sm text-slate-500">Logged in as {user.email}</p>
        )}
      </div>
    </div>
  )
}
