import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'

const GOALS = [
  { value: 'break_into_tech', label: 'Break into tech' },
  { value: 'interview_prep', label: 'Interview prep' },
  { value: 'stay_sharp', label: 'Stay sharp' },
]

const LEVELS = [
  { value: 'entry', label: 'Entry' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
]

const TRACKS = [
  { value: 'general', label: 'General' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
]

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
]

const inputClass =
  'mt-1 block w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[#0F172A]'

export default function Profile() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmCard, setShowConfirmCard] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      goal: 'interview_prep',
      level: 'entry',
      track: 'general',
      language: 'javascript',
    },
  })

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('goal, level, track, language')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      setFetchError(error?.message || null)
      if (data) reset(data)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user?.id, reset])

  const onSubmit = async (values) => {
    if (!user?.id) return
    setSaveSuccess(false)
    setFetchError(null)
    const { error } = await supabase.from('user_settings').upsert(
      {
        user_id: user.id,
        goal: values.goal,
        level: values.level,
        track: values.track,
        language: values.language,
      },
      { onConflict: 'user_id' }
    )
    if (error) {
      setFetchError(error.message)
      return
    }
    setSaveSuccess(true)
  }

  const openConfirmPasswordCard = () => {
    if (!newPassword.trim()) {
      setPasswordError('Enter a new password first.')
      setPasswordSuccess(false)
      return
    }
    setPasswordError(null)
    setPasswordSuccess(false)
    setConfirmPassword('')
    setShowConfirmCard(true)
  }

  const handlePasswordChange = async () => {
    if (!newPassword.trim()) {
      setPasswordError('Enter a new password first.')
      return
    }
    if (!confirmPassword.trim()) {
      setPasswordError('Confirm your new password.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setPasswordSaving(true)
    setPasswordError(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)

    if (error) {
      setPasswordError(error.message)
      return
    }

    setShowConfirmCard(false)
    setPasswordSuccess(true)
    setConfirmPassword('')
    setNewPassword('')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <p className="text-slate-600">Sign in to view your profile.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <p className="text-slate-600">Loading profile…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-xl font-semibold text-[#0F172A]">Profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your account and preferences. Used to personalize your daily pack.
        </p>

        {fetchError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {fetchError}
          </div>
        )}

        {saveSuccess && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            Preferences saved.
          </div>
        )}

        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-500">Email</label>
          <p className="mt-0.5 text-[#0F172A]" title={user.email}>
            {user.email}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#0F172A]">Goal</label>
            <select {...register('goal', { required: true })} className={inputClass}>
              {GOALS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {errors.goal && <p className="mt-1 text-sm text-red-600">Required</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A]">Level</label>
            <select {...register('level', { required: true })} className={inputClass}>
              {LEVELS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {errors.level && <p className="mt-1 text-sm text-red-600">Required</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A]">Track</label>
            <select {...register('track', { required: true })} className={inputClass}>
              {TRACKS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {errors.track && <p className="mt-1 text-sm text-red-600">Required</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A]">
              Preferred language (for code)
            </label>
            <select {...register('language', { required: true })} className={inputClass}>
              {LANGUAGES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {errors.language && <p className="mt-1 text-sm text-red-600">Required</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#4338CA] disabled:opacity-50"
          >
            {isSubmitting ? 'Saving…' : 'Save preferences'}
          </button>
        </form>

        <div className="mt-10 border-t border-[#E2E8F0] pt-8">
          <h2 className="text-lg font-semibold text-[#0F172A]">Change Password</h2>
          <p className="mt-1 text-sm text-slate-600">Enter a new password, then confirm it in the popup card.</p>

          {passwordSuccess && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              Password updated successfully.
            </div>
          )}
          {passwordError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {passwordError}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[260px] flex-1">
              <label htmlFor="new-password" className="block text-sm font-medium text-[#0F172A]">New password</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                placeholder="Enter your new password"
              />
            </div>
            <button
              type="button"
              onClick={openConfirmPasswordCard}
              className="rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#4338CA]"
            >
              Change password
            </button>
          </div>
        </div>
      </div>

      {showConfirmCard && (
        <div className="fixed inset-0 z-30 bg-black/30 flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-[#0F172A]">Confirm New Password</h3>
            <p className="mt-1 text-sm text-slate-600">Re-enter the same password to confirm.</p>
            <div className="mt-4">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-[#0F172A]">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="Enter the same password"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmCard(false)}
                className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium text-[#0F172A] hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasswordChange}
                disabled={passwordSaving}
                className="rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#4338CA] disabled:opacity-50"
              >
                {passwordSaving ? 'Updating…' : 'Confirm password change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


