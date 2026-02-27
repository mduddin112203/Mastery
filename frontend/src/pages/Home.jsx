import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
          <h1 className="text-2xl font-semibold text-[#0F172A]">
            Welcome to Mastery
          </h1>
          <p className="mt-2 text-slate-600">
            This is your placeholder home screen. We&apos;ll plug in today&apos;s pack,
            practice modes, and progress once those pieces are ready.
          </p>
          {user && (
            <p className="mt-4 text-sm text-slate-500">
              Logged in as <span className="font-medium">{user.email}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
