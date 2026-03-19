import { useCallback, useEffect, useMemo, useState } from 'react'
import { submitAttempt } from '../services/packService'
import QuestionPlayerCard from '../components/QuestionPlayerCard'
import { getMissedQuestions, getRandomPracticeQuestions, getUserSettings, getWeakTopicQuestions } from '../services/practiceService'

const MODE_OPTIONS = [
  { id: 'random', label: 'Random' },
  { id: 'missed', label: 'Missed' },
  { id: 'weak', label: 'Weak Topics' },
]

const LANE_OPTIONS = [
  { id: 'all', label: 'All lanes' },
  { id: 'code', label: 'Code' },
  { id: 'system', label: 'System Design' },
  { id: 'behavioral', label: 'Behavioral' },
]

export default function Practice() {
  const [settings, setSettings] = useState(null)
  const [mode, setMode] = useState('random')
  const [lane, setLane] = useState('all')
  const [limit, setLimit] = useState(5)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { settings: s, error: err } = await getUserSettings()
      if (err) return
      setSettings(s)
    })()
  }, [])

  const subtitle = useMemo(() => {
    if (mode === 'random') return 'Grab a quick mixed set of questions.'
    if (mode === 'missed') return 'Retry questions you previously got wrong.'
    return 'Focus on weak topics (low accuracy) or last marked Hard.'
  }, [mode])

  const startSession = useCallback(async () => {
    setLoading(true)
    setError(null)
    setQuestions([])
    setCurrentIndex(0)
    setComplete(false)

    try {
      if (mode === 'random') {
        const { questions: qs, error: err } = await getRandomPracticeQuestions({ lane, limit })
        if (err) setError(err)
        setQuestions(qs || [])
      } else if (mode === 'missed') {
        const { questions: qs, error: err } = await getMissedQuestions({ lane, limit })
        if (err) setError(err)
        setQuestions(qs || [])
      } else {
        const { questions: qs, error: err } = await getWeakTopicQuestions({ lane, limit })
        if (err) setError(err)
        setQuestions(qs || [])
      }
    } catch (e) {
      setError(e?.message || 'Failed to start session')
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }, [lane, limit, mode])

  const current = questions[currentIndex] || null

  const handleNext = () => {
    if (currentIndex >= questions.length - 1) {
      setComplete(true)
      return
    }
    setCurrentIndex((i) => i + 1)
  }

  const handleSubmitAttempt = async ({ selectedIndex, isCorrect, confidence, timeSpentSec }) => {
    if (!current?.id) return { error: 'Missing question' }
    const { error: err } = await submitAttempt({
      packId: null,
      questionId: current.id,
      selectedIndex,
      isCorrect,
      confidence,
      timeSpentSec,
    })
    return { error: err || null }
  }

  return (
    <div className="min-h-screen bg-indigo-50/50 text-indigo-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-indigo-950">Practice</h1>
          <p className="mt-1 text-sm text-indigo-700/80">{subtitle}</p>
          {settings && (
            <p className="mt-2 text-xs text-indigo-700/70">
              Using your settings: <span className="font-medium">{settings.level}</span> /{' '}
              <span className="font-medium">{settings.track}</span> / <span className="font-medium">{settings.language}</span>
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-indigo-900/80">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="mt-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-indigo-950"
              >
                {MODE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-indigo-900/80">Lane</label>
              <select
                value={lane}
                onChange={(e) => setLane(e.target.value)}
                className="mt-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-indigo-950"
              >
                {LANE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-indigo-900/80">Questions</label>
              <select
                value={String(limit)}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="mt-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-indigo-950"
              >
                {[5, 10, 15].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={startSession}
              disabled={loading}
              className="ml-auto rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Loading…' : questions.length > 0 && !complete ? 'Restart' : 'Start'}
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        {!loading && questions.length === 0 && !complete && (
          <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-6 text-sm text-indigo-700">
            Pick a mode and hit <span className="font-medium">Start</span>.
          </div>
        )}

        {!loading && questions.length > 0 && !complete && current && (
          <div className="mt-6 space-y-6">
            <p className="text-sm text-indigo-700/80">
              Question {currentIndex + 1} of {questions.length}
            </p>
            <QuestionPlayerCard
              key={current.id}
              mode="play"
              question={current}
              onSubmitAttempt={handleSubmitAttempt}
              onNext={handleNext}
              nextLabel={currentIndex >= questions.length - 1 ? 'Finish' : 'Next question'}
            />
          </div>
        )}

        {complete && (
          <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-8 text-center">
            <p className="text-lg font-semibold text-indigo-950">Session complete</p>
            <p className="mt-2 text-sm text-indigo-700/80">You answered {questions.length} questions.</p>
            <button
              type="button"
              onClick={startSession}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Run again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
