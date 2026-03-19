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

function formatSettingLabel(value) {
  if (!value) return ''
  return String(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

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
  const [sessionKey, setSessionKey] = useState(0)
  const [sessionAttempts, setSessionAttempts] = useState([])

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
    setSessionKey((k) => k + 1)
    setSessionAttempts([])

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
  const sessionSummary = useMemo(() => {
    const answered = sessionAttempts.length
    const correct = sessionAttempts.reduce((sum, a) => sum + (a.isCorrect ? 1 : 0), 0)
    const wrong = answered - correct

    const laneCorrectCounts = new Map()
    const laneWrongCounts = new Map()
    const topicCorrectCounts = new Map()
    const topicWrongCounts = new Map()

    for (const a of sessionAttempts) {
      const laneLabel = formatSettingLabel(a.lane || 'unknown')
      const topicLabel = formatSettingLabel(a.topic || 'unknown')
      const topicKey = topicLabel

      if (a.isCorrect) {
        laneCorrectCounts.set(laneLabel, (laneCorrectCounts.get(laneLabel) || 0) + 1)
        topicCorrectCounts.set(topicKey, (topicCorrectCounts.get(topicKey) || 0) + 1)
      } else {
        laneWrongCounts.set(laneLabel, (laneWrongCounts.get(laneLabel) || 0) + 1)
        topicWrongCounts.set(topicKey, (topicWrongCounts.get(topicKey) || 0) + 1)
      }
    }

    const strongLanes = [...laneCorrectCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
    const struggledLanes = [...laneWrongCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
    const strongTopics = [...topicCorrectCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
    const struggledTopics = [...topicWrongCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    return { answered, correct, wrong, strongLanes, struggledLanes, strongTopics, struggledTopics }
  }, [sessionAttempts])

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
    if (!err) {
      setSessionAttempts((prev) => {
        const next = prev.filter((a) => a.questionId !== current.id)
        next.push({
          questionId: current.id,
          lane: current.lane,
          topic: current.topic,
          isCorrect,
        })
        return next
      })
    }
    return { error: err || null }
  }

  return (
    <div className="min-h-screen bg-indigo-50/50 text-indigo-950">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-indigo-950">Practice</h1>
          <p className="mt-1 text-sm text-indigo-700/80">{subtitle}</p>
          {settings && (
            <p className="mt-2 text-sm text-indigo-700/80">
              Using your settings: <span className="font-medium">{formatSettingLabel(settings.level)}</span> /{' '}
              <span className="font-medium">{formatSettingLabel(settings.track)}</span> /{' '}
              <span className="font-medium">{formatSettingLabel(settings.language)}</span>
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-indigo-900/80">Mode</label>
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
              <label className="block text-sm font-medium text-indigo-900/80">Lane</label>
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
              <label className="block text-sm font-medium text-indigo-900/80">Questions</label>
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
          <div className="mt-5 space-y-4">
            <p className="text-sm text-indigo-700/80">
              Question {currentIndex + 1} of {questions.length}
            </p>
            <QuestionPlayerCard
              key={current.id}
              mode="play"
              question={current}
              sessionKey={sessionKey}
              onSubmitAttempt={handleSubmitAttempt}
              onNext={handleNext}
              nextLabel={currentIndex >= questions.length - 1 ? 'Finish' : 'Next question'}
            />
          </div>
        )}

        {complete && (
          <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-8 text-center">
            <p className="text-lg font-semibold text-indigo-950">Session Complete</p>
            <p className="mt-2 text-sm text-indigo-700/80">You answered {sessionSummary.answered} questions.</p>
            <div className="mt-5 grid grid-cols-1 gap-4 text-left md:grid-cols-2">
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-semibold text-[#0F172A]">
                  Correct: {sessionSummary.correct} / {sessionSummary.answered}
                </p>
                <p className="mt-3 text-sm font-medium text-[#0F172A]">Strong lanes:</p>
                {sessionSummary.strongLanes.length > 0 ? (
                  <ul className="mt-1 list-disc pl-5 text-sm text-green-700 space-y-1">
                    {sessionSummary.strongLanes.map(([name, count]) => (
                      <li key={`strong-lane-${name}`}>{name} ({count})</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-green-700">None this run</p>
                )}
                <p className="mt-3 text-sm font-medium text-[#0F172A]">Strong topics:</p>
                {sessionSummary.strongTopics.length > 0 ? (
                  <ul className="mt-1 list-disc pl-5 text-sm text-green-700 space-y-1">
                    {sessionSummary.strongTopics.map(([name, count]) => (
                      <li key={`strong-topic-${name}`}>{name} ({count})</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-green-700">None this run</p>
                )}
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-[#0F172A]">
                  Incorrect: {sessionSummary.wrong} / {sessionSummary.answered}
                </p>
                <p className="mt-3 text-sm font-medium text-[#0F172A]">Struggled lanes:</p>
                {sessionSummary.struggledLanes.length > 0 ? (
                  <ul className="mt-1 list-disc pl-5 text-sm text-red-700 space-y-1">
                    {sessionSummary.struggledLanes.map(([name, count]) => (
                      <li key={`struggled-lane-${name}`}>{name} ({count})</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-red-700">None this run</p>
                )}
                <p className="mt-3 text-sm font-medium text-[#0F172A]">Struggled topics:</p>
                {sessionSummary.struggledTopics.length > 0 ? (
                  <ul className="mt-1 list-disc pl-5 text-sm text-red-700 space-y-1">
                    {sessionSummary.struggledTopics.map(([name, count]) => (
                      <li key={`struggled-topic-${name}`}>{name} ({count})</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-red-700">None this run</p>
                )}
              </div>
            </div>
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


