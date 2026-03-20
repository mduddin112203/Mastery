import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
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

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [isFirstTime, setIsFirstTime] = useState(false)

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
      // Defer state update to avoid react-hooks lint complaints about cascading renders.
      queueMicrotask(() => setLoading(false))
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
      if (data) {
        reset(data)
        setIsFirstTime(false)
      } else {
        setIsFirstTime(true)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user?.id, reset])

  const onSubmit = async (values) => {
    if (!user?.id) return
    setSaved(false)
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
    setFetchError(null)
    setSaved(true)
    navigate('/home', { replace: true })
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <p className="text-slate-600">Sign in to set your preferences.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <p className="text-slate-600">Loading your settings…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-xl font-semibold text-[#0F172A]">
          {isFirstTime ? 'Create your profile' : 'Preferences'}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {isFirstTime
            ? 'Set your goals and preferences so your daily pack is personalized for you. You can change these later in Preferences.'
            : 'Used to personalize your daily pack (level, track, language).'}
        </p>

        {fetchError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {fetchError}
          </div>
        )}

        {saved && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            Profile saved. Taking you to today&apos;s pack…
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#0F172A]">Goal</label>
            <select
              {...register('goal', { required: true })}
              className="mt-1 block w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[#0F172A]"
            >
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
            <select
              {...register('level', { required: true })}
              className="mt-1 block w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[#0F172A]"
            >
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
            <select
              {...register('track', { required: true })}
              className="mt-1 block w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[#0F172A]"
            >
              {TRACKS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {errors.track && <p className="mt-1 text-sm text-red-600">Required</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A]">Preferred language (for code)</label>
            <select
              {...register('language', { required: true })}
              className="mt-1 block w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[#0F172A]"
            >
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
            {isSubmitting ? 'Saving…' : isFirstTime ? 'Create profile & continue' : 'Save preferences'}
          </button>
        </form>
      </div>
    </div>
  )
}


