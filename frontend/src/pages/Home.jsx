import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  loadTodayPack,
  submitAttempt,
  completePack,
  getPreviousPacks,
  loadPackForReview,
} from '../services/packService'
import QuestionPlayerCard from '../components/QuestionPlayerCard'

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
  const [packComplete, setPackComplete] = useState(false)

  const fetchPack = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPackComplete(false)
    setViewMode('today')
    setCurrentIndex(0)
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

  const handleNext = () => {
    if (currentIndex >= items.length - 1) {
      setPackComplete(true)
      fetchPack()
      return
    }
    setCurrentIndex((i) => i + 1)
  }

  const handleSubmitAttempt = async ({ selectedIndex, isCorrect, confidence, timeSpentSec }) => {
    if (!q?.id || !packId) return { error: 'Missing pack/question' }
    const { error: err } = await submitAttempt({
      packId,
      questionId: q.id,
      selectedIndex,
      isCorrect,
      confidence,
      timeSpentSec,
    })
    if (err) return { error: err }

    // If this was the last question, mark the whole pack complete immediately.
    if (currentIndex >= items.length - 1) {
      await completePack(packId)
      setPackComplete(true)
      await fetchPack()
    }

    return { error: null }
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
              return (
                <div>
                  <QuestionPlayerCard
                    mode="review"
                    question={{ ...revQ, lane: revItem.lane }}
                    attempt={revAttempt}
                  />
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
                </div>
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
            <QuestionPlayerCard
              key={q?.id}
              mode="play"
              question={{ ...q, lane: item.lane }}
              onSubmitAttempt={handleSubmitAttempt}
              onNext={handleNext}
              nextLabel={currentIndex >= items.length - 1 ? 'Done' : 'Next question'}
            />
          </div>
        )}
      </div>
    </div>
  )
}
