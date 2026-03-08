import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  loadTodayPack,
  submitAttempt,
  completePack,
  getPreviousPacks,
  loadPackForReview,
} from '../services/packService'

const LANE_LABELS = { code: 'Code', system: 'System Design', behavioral: 'Behavioral' }
const LANE_STYLES = {
  code: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  system: 'bg-cyan-50 border-cyan-200 text-cyan-800',
  behavioral: 'bg-violet-50 border-violet-200 text-violet-800',
}
const CONFIDENCE_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'ok', label: 'OK' },
  { value: 'hard', label: 'Hard' },
]
const CONFIDENCE_LABELS = { easy: 'Easy', ok: 'OK', hard: 'Hard' }

function formatDate(d) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d + 'Z') : new Date(d)
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Home() {
  const { user } = useAuth()
  const [packId, setPackId] = useState(null)
  const [packDate, setPackDate] = useState(null)
  const [items, setItems] = useState([])
  const [completedAt, setCompletedAt] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [previousPacks, setPreviousPacks] = useState([])
  const [viewMode, setViewMode] = useState('today')
  const [reviewIndex, setReviewIndex] = useState(0)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [confidence, setConfidence] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [packComplete, setPackComplete] = useState(false)
  const questionStartRef = useRef(null)

  const fetchPack = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPackComplete(false)
    setViewMode('today')
    setCurrentIndex(0)
    setSelectedIndex(null)
    setSubmitted(false)
    setConfidence(null)
    setReviewIndex(0)
    try {
      const result = await loadTodayPack()
      setPackId(result.packId)
      setPackDate(result.packDate)
      setItems(result.items || [])
      setCompletedAt(!!result.completedAt)
      setError(result.error || null)
    } catch (e) {
      setError(e?.message || 'Failed to load pack')
      setItems([])
    }
    setLoading(false)
    questionStartRef.current = Date.now()
  }, [])

  const fetchPreviousPacks = useCallback(async () => {
    try {
      const { packs } = await getPreviousPacks()
      setPreviousPacks(packs || [])
    } catch (_e) {
      setPreviousPacks([])
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchPack()
      fetchPreviousPacks()
    } else setLoading(false)
  }, [user, fetchPack, fetchPreviousPacks])

  const loadPastPack = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    setViewMode('past')
    const { pack, items: revItems, error: err } = await loadPackForReview(id)
    if (err) {
      setError(err)
      setLoading(false)
      return
    }
    setPackId(pack?.id || null)
    setPackDate(pack?.pack_date || null)
    setItems(revItems || [])
    setCompletedAt(true)
    setReviewIndex(0)
    setLoading(false)
  }, [])

  const isReadOnly = completedAt || viewMode === 'past'
  const today = new Date().toISOString().slice(0, 10)
  const isToday = packDate === today

  const item = items[isReadOnly ? reviewIndex : currentIndex]
  const q = item?.question
  const choices = Array.isArray(q?.choices) ? q.choices : []
  const isCorrect = q && selectedIndex !== null && selectedIndex === q.answer_index
  const showConfidence = submitted && confidence === null && !saving && !submitError
  const showNext = submitted && confidence !== null

  const handleSubmit = () => {
    if (selectedIndex === null) return
    setSubmitted(true)
  }

  const handleConfidence = async (value) => {
    if (!item?.question?.id || !packId || saving) return
    setSaving(true)
    setSubmitError(null)
    const timeSpent = questionStartRef.current ? Math.round((Date.now() - questionStartRef.current) / 1000) : null
    const { error: err } = await submitAttempt({
      packId,
      questionId: item.question.id,
      selectedIndex,
      isCorrect,
      confidence: value,
      timeSpentSec: timeSpent,
    })
    if (err) {
      setSubmitError(err)
      setSaving(false)
      return
    }
    setConfidence(value)
    setSaving(false)
    if (currentIndex >= items.length - 1) {
      await completePack(packId)
      setPackComplete(true)
      fetchPack()
    }
  }

  const handleNext = () => {
    if (currentIndex >= items.length - 1) {
      setPackComplete(true)
      fetchPack()
      return
    }
    setCurrentIndex((i) => i + 1)
    setSelectedIndex(null)
    setSubmitted(false)
    setConfidence(null)
    setSubmitError(null)
    questionStartRef.current = Date.now()
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-indigo-50/50 text-indigo-950">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <p className="text-indigo-700">Sign in to see your daily pack.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-indigo-50/50 text-indigo-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-indigo-950">
              {viewMode === 'past' ? `Pack — ${formatDate(packDate)}` : "Today's Pack"}
              {isReadOnly && isToday && ' — Completed'}
            </h1>
            <p className="mt-1 text-sm text-indigo-700/80">{formatDate(packDate) || today}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {viewMode === 'past' && (
              <button
                type="button"
                onClick={fetchPack}
                className="rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-sm font-medium text-indigo-800 hover:bg-indigo-100"
              >
                Back to today
              </button>
            )}
            {viewMode === 'today' && !completedAt && !packComplete && (
              <button
                type="button"
                onClick={fetchPack}
                disabled={loading}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Loading…' : 'Refresh'}
              </button>
            )}
            {previousPacks.length > 0 && (
              <select
                value={viewMode === 'past' ? packId : ''}
                onChange={(e) => {
                  const id = e.target.value
                  if (id) loadPastPack(id)
                  else fetchPack()
                }}
                className="rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-sm text-indigo-900"
              >
                <option value="">Previous days…</option>
                {previousPacks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {formatDate(p.pack_date)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-8 text-center text-indigo-700">
            Loading your pack…
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <p className="font-medium">Something went wrong</p>
            <p className="mt-1 text-sm">{error}</p>
            <button type="button" onClick={fetchPack} className="mt-3 text-sm font-medium text-red-600 underline">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-8 text-center text-indigo-800">
            <p>No questions in today&apos;s pack yet.</p>
            <p className="mt-1 text-sm text-indigo-700">Make sure the question bank is seeded and your preferences are set.</p>
            <button
              type="button"
              onClick={fetchPack}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Generate pack
            </button>
          </div>
        )}

        {packComplete && items.length > 0 && !completedAt && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-6 text-center text-indigo-700">
            Saving… Reloading your completed pack.
          </div>
        )}

        {!loading && !error && items.length > 0 && isReadOnly && (
          <div className="space-y-6">
            <p className="text-sm text-indigo-700/80">
              Question {reviewIndex + 1} of {items.length}
            </p>
            {items[reviewIndex] && (() => {
              const revItem = items[reviewIndex]
              const revQ = revItem?.question
              const revAttempt = revItem?.attempt
              const revChoices = Array.isArray(revQ?.choices) ? revQ.choices : []
              const selIdx = revAttempt?.selected_index ?? -1
              const correct = revAttempt?.is_correct ?? false
              return (
                <article className={`rounded-xl border-2 border-indigo-200 bg-indigo-50/70 p-4 ${LANE_STYLES[revItem.lane] || LANE_STYLES.code}`}>
                  <span className="text-xs font-medium uppercase tracking-wide text-indigo-700/90">
                    {LANE_LABELS[revItem.lane]}
                  </span>
                  <h3 className="mt-1 font-semibold text-[#0F172A]">{revQ?.prompt}</h3>
                  {revQ?.snippet && (
                    <pre className="mt-2 overflow-x-auto rounded bg-black/5 p-3 text-sm font-mono text-[#0F172A]">
                      {revQ.snippet}
                    </pre>
                  )}
                  <ul className="mt-3 space-y-2">
                    {revChoices.map((opt, i) => (
                      <li
                        key={i}
                        className={`w-full rounded-lg border px-3 py-2 text-sm ${
                          selIdx === i && correct
                            ? 'border-green-500 bg-green-50'
                            : selIdx === i
                              ? 'border-red-400 bg-red-50'
                              : i === revQ?.answer_index
                                ? 'border-green-300 bg-green-50/50'
                                : 'border-[#E2E8F0] bg-white'
                        }`}
                      >
                        {String(opt)}
                        {selIdx === i && correct && ' ✓ Your answer'}
                        {selIdx === i && !correct && ' ✗ Your answer'}
                        {i === revQ?.answer_index && selIdx !== i && ' — Correct'}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 rounded-lg border border-indigo-200 bg-white p-3 text-sm text-indigo-950">
                    <p className="font-medium">{correct ? 'Correct.' : 'Not quite.'}</p>
                    <p className="mt-1">{revQ?.explanation}</p>
                    {revAttempt?.confidence && (
                      <p className="mt-2 text-indigo-600">
                        You marked this: {CONFIDENCE_LABELS[revAttempt.confidence] || revAttempt.confidence}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={reviewIndex === 0}
                      onClick={() => setReviewIndex((i) => Math.max(0, i - 1))}
                      className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-800 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={reviewIndex >= items.length - 1}
                      onClick={() => setReviewIndex((i) => Math.min(items.length - 1, i + 1))}
                      className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-800 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </article>
              )
            })()}
          </div>
        )}

        {!loading && !error && items.length > 0 && !isReadOnly && (!item || !q) && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
            <p className="font-medium">Unable to load this question</p>
            <button
                type="button"
                onClick={fetchPack}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Refresh pack
              </button>
          </div>
        )}

        {!loading && !error && items.length > 0 && !packComplete && !isReadOnly && item && q && (
          <div className="space-y-6">
            <p className="text-sm text-indigo-700/80">
              Question {currentIndex + 1} of {items.length}
            </p>
            <article
              className={`rounded-xl border-2 border-indigo-200 bg-indigo-50/70 p-4 ${LANE_STYLES[item.lane] || LANE_STYLES.code}`}
              data-lane={item.lane}
            >
              <span className="text-xs font-medium uppercase tracking-wide text-indigo-700/90">
                {LANE_LABELS[item.lane]}
              </span>
              <h3 className="mt-1 font-semibold text-[#0F172A]">{q.prompt}</h3>
              {q.snippet && (
                <pre className="mt-2 overflow-x-auto rounded bg-black/5 p-3 text-sm font-mono text-[#0F172A]">
                  {q.snippet}
                </pre>
              )}
              <ul className="mt-3 space-y-2">
                {choices.map((opt, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => !submitted && setSelectedIndex(i)}
                      disabled={submitted}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default ${
                        selectedIndex === i
                          ? 'border-indigo-600 bg-indigo-100 text-indigo-950'
                          : submitted && i === q.answer_index
                            ? 'border-green-500 bg-green-50 text-[#0F172A]'
                            : submitted && i === selectedIndex && !isCorrect
                              ? 'border-red-400 bg-red-50 text-[#0F172A]'
                              : 'border-indigo-200 bg-white text-indigo-950 hover:border-indigo-300 hover:bg-indigo-50/50'
                      }`}
                    >
                      {String(opt)}
                      {submitted && i === q.answer_index && ' ✓'}
                      {submitted && i === selectedIndex && !isCorrect && i !== q.answer_index && ' ✗'}
                    </button>
                  </li>
                ))}
              </ul>

              {!submitted && (
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={selectedIndex === null}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit
                  </button>
                  {selectedIndex === null && (
                    <span className="text-sm text-indigo-600/80">Select an answer above</span>
                  )}
                </div>
              )}

              {submitted && (
                <>
                  <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-white p-3 text-sm text-[#0F172A]">
                    <p className="font-medium">{isCorrect ? 'Correct.' : 'Not quite.'}</p>
                    <p className="mt-1">{q.explanation}</p>
                  </div>

                  {showConfidence && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-[#0F172A]">How did this feel?</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {CONFIDENCE_OPTIONS.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => handleConfidence(o.value)}
                            disabled={saving}
                            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#0F172A] hover:bg-slate-50 disabled:opacity-50"
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                      {submitError && (
                        <p className="mt-2 text-sm text-red-600">{submitError}</p>
                      )}
                    </div>
                  )}

                  {showNext && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleNext}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                      >
                        {currentIndex >= items.length - 1 ? 'Done' : 'Next question'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </article>
          </div>
        )}
      </div>
    </div>
  )
}
