import { useEffect, useMemo, useRef, useState } from 'react'

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

/**
 * Reusable Question Player card.
 * - mode="play": interactive MCQ + after-submit explanation + confidence rating + time tracking.
 * - mode="review": read-only rendering of the user's previous attempt + explanation.
 */
export default function QuestionPlayerCard({
  mode = 'play',
  question,
  attempt,
  onSubmitAttempt,
  onNext,
  nextLabel,
}) {
  const isReview = mode === 'review'

  const lane = question?.lane
  const laneStyle = LANE_STYLES[lane] || LANE_STYLES.code
  const laneLabel = LANE_LABELS[lane] || 'Code'

  const choices = useMemo(() => {
    const c = question?.choices
    return Array.isArray(c) ? c : []
  }, [question?.choices])

  const answerIndex = typeof question?.answer_index === 'number' ? question.answer_index : null
  const isValidAnswerIndex = answerIndex !== null

  const startTsRef = useRef(null)

  const [selectedIndex, setSelectedIndex] = useState(null)
  const [submitted, setSubmitted] = useState(isReview)
  const [confidence, setConfidence] = useState(isReview ? attempt?.confidence ?? null : null)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [hasSavedAttempt, setHasSavedAttempt] = useState(isReview)

  const isCorrectNow = isReview ? !!attempt?.is_correct : selectedIndex !== null && isValidAnswerIndex && selectedIndex === answerIndex

  useEffect(() => {
    if (!question?.id) return
    if (isReview) return

    // Restart the per-question timer whenever the question changes.
    startTsRef.current = Date.now()
    setSelectedIndex(null)
    setSubmitted(false)
    setConfidence(null)
    setSaving(false)
    setSubmitError(null)
    setHasSavedAttempt(false)
  }, [question?.id, isReview])

  const handleSubmit = () => {
    if (selectedIndex === null) return
    setSubmitted(true)
  }

  const saveAttempt = async (valueOrNull) => {
    if (!onSubmitAttempt || saving) return
    if (!question?.id || answerIndex === null) return
    if (selectedIndex === null) return

    setSaving(true)
    setSubmitError(null)

    const timeSpentSec = startTsRef.current ? Math.round((Date.now() - startTsRef.current) / 1000) : null

    try {
      const res = await onSubmitAttempt({
        selectedIndex,
        isCorrect: selectedIndex === answerIndex,
        confidence: valueOrNull ?? null,
        timeSpentSec,
      })

      if (res?.error) {
        setSubmitError(res.error)
        setSaving(false)
        return false
      }

      setConfidence(valueOrNull ?? null)
      setHasSavedAttempt(true)
      setSaving(false)
      return true
    } catch (e) {
      setSubmitError(e?.message || 'Failed to submit')
      setSaving(false)
      return false
    }
  }

  const selIdxReview = attempt?.selected_index ?? -1
  const correctReview = attempt?.is_correct ?? false
  const showConfidence = !isReview && submitted && confidence === null && !saving && !submitError
  const showNext = !isReview && submitted && !saving

  const handleConfidence = async (value) => {
    await saveAttempt(value)
  }

  const handleNext = async () => {
    if (!onNext) return
    // If user didn't pick confidence, still record the attempt with confidence=null.
    if (!hasSavedAttempt) {
      const ok = await saveAttempt(null)
      // If save failed, keep them here.
      if (!ok) return
    }
    onNext()
  }

  if (isReview) {
    return (
      <article className={`rounded-xl border-2 border-indigo-200 bg-indigo-50/70 p-4 ${laneStyle}`}>
        <span className="text-xs font-medium uppercase tracking-wide text-indigo-700/90">{laneLabel}</span>
        <h3 className="mt-1 font-semibold text-[#0F172A]">{question?.prompt}</h3>
        {question?.snippet && (
          <pre className="mt-2 overflow-x-auto rounded bg-black/5 p-3 text-sm font-mono text-[#0F172A]">{question.snippet}</pre>
        )}

        <ul className="mt-3 space-y-2">
          {choices.map((opt, i) => (
            <li key={i}>
              <div
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  selIdxReview === i && correctReview
                    ? 'border-green-500 bg-green-50'
                    : selIdxReview === i
                      ? 'border-red-400 bg-red-50'
                      : i === answerIndex
                        ? 'border-green-300 bg-green-50/50'
                        : 'border-[#E2E8F0] bg-white'
                }`}
              >
                {String(opt)}
                {selIdxReview === i && correctReview && ' ✓ Your answer'}
                {selIdxReview === i && !correctReview && ' ✗ Your answer'}
                {i === answerIndex && selIdxReview !== i && ' — Correct'}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-lg border border-indigo-200 bg-white p-3 text-sm text-indigo-950">
          <p className="font-medium">{correctReview ? 'Correct.' : 'Not quite.'}</p>
          <p className="mt-1">{question?.explanation}</p>
          {attempt?.confidence && (
            <p className="mt-2 text-indigo-600">
              You marked this: {CONFIDENCE_LABELS[attempt.confidence] || attempt.confidence}
            </p>
          )}
        </div>
      </article>
    )
  }

  return (
    <article className={`rounded-xl border-2 border-indigo-200 bg-indigo-50/70 p-4 ${laneStyle}`} data-lane={lane}>
      <span className="text-xs font-medium uppercase tracking-wide text-indigo-700/90">{laneLabel}</span>
      <h3 className="mt-1 font-semibold text-[#0F172A]">{question?.prompt}</h3>

      {question?.snippet && (
        <pre className="mt-2 overflow-x-auto rounded bg-black/5 p-3 text-sm font-mono text-[#0F172A]">{question.snippet}</pre>
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
                  : submitted && i === answerIndex
                    ? 'border-green-500 bg-green-50 text-[#0F172A]'
                    : submitted && i === selectedIndex && !isCorrectNow
                      ? 'border-red-400 bg-red-50 text-[#0F172A]'
                      : 'border-indigo-200 bg-white text-indigo-950 hover:border-indigo-300 hover:bg-indigo-50/50'
              }`}
            >
              {String(opt)}
              {submitted && i === answerIndex && ' ✓'}
              {submitted && i === selectedIndex && !isCorrectNow && i !== answerIndex && ' ✗'}
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
          {selectedIndex === null && <span className="text-sm text-indigo-600/80">Select an answer above</span>}
        </div>
      )}

      {submitted && (
        <>
          <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-white p-3 text-sm text-[#0F172A]">
            <p className="font-medium">{isCorrectNow ? 'Correct.' : 'Not quite.'}</p>
            <p className="mt-1">{question?.explanation}</p>
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
              {submitError && <p className="mt-2 text-sm text-red-600">{submitError}</p>}
            </div>
          )}

          {showNext && onNext && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleNext}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
              >
                {nextLabel || 'Next'}
              </button>
            </div>
          )}
        </>
      )}
    </article>
  )
}

