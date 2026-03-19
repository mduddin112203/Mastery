import { useEffect, useMemo, useState } from 'react'
import { loadProgressSummary } from '../services/progressService'

function pct(x) {
  if (!Number.isFinite(x)) return '0%'
  return `${Math.round(x * 100)}%`
}

function formatLabel(value) {
  if (!value) return ''
  return String(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function Progress() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      const { summary: s, error: err } = await loadProgressSummary()
      if (err) setError(err)
      setSummary(s)
      setLoading(false)
    })()
  }, [])

  const maxActivity = useMemo(() => {
    const xs = summary?.weeklyActivity || []
    return xs.reduce((m, x) => Math.max(m, x.count), 0) || 1
  }, [summary])

  return (
    <div className="min-h-screen bg-indigo-50/50 text-indigo-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-indigo-950">Progress</h1>
          <p className="mt-1 text-sm text-indigo-700/80">Check streak, weekly activity, and accuracy.</p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-8 text-center text-indigo-700">
            Loading…
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <p className="font-medium">Something went wrong</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && summary && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-indigo-200 bg-white p-5">
                <p className="text-sm font-medium text-indigo-700/80">Current streak</p>
                <p className="mt-2 text-3xl font-semibold text-indigo-950">{summary.streak}</p>
                <p className="mt-1 text-xs text-indigo-700/70">Days in a row completed</p>
              </div>

              <div className="rounded-2xl border border-indigo-200 bg-white p-5 sm:col-span-2">
                <p className="text-sm font-medium text-indigo-700/80">Weekly activity</p>
                <div className="mt-3 grid grid-cols-7 gap-2 items-end">
                  {(summary.weeklyActivity || []).map((d) => (
                    <div key={d.date} className="flex flex-col items-center gap-2">
                      <div
                        title={`${d.count} attempts`}
                        className="w-6 rounded-md bg-indigo-600/80"
                        style={{ height: `${Math.max(6, Math.round((d.count / maxActivity) * 64))}px` }}
                      />
                      <span className="text-[10px] text-indigo-700/70">{d.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-indigo-200 bg-white p-5">
                <p className="text-sm font-medium text-indigo-700/80">Lane accuracy (last 7 days)</p>
                {(summary.laneAccuracy || []).length === 0 ? (
                  <p className="mt-3 text-sm text-indigo-700/70">No attempts yet.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {(summary.laneAccuracy || []).map((x) => (
                      <li key={x.lane}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-indigo-950">{formatLabel(x.lane)}</span>
                          <span className="text-indigo-700/80">
                            {pct(x.accuracy)} <span className="text-indigo-300">•</span> {x.correct}/{x.total}
                          </span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-indigo-100">
                          <div
                            className="h-2 rounded-full bg-indigo-600"
                            style={{ width: `${Math.round((x.accuracy || 0) * 100)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-indigo-200 bg-white p-5">
                <p className="text-sm font-medium text-indigo-700/80">Weakest topics (last 7 days)</p>
                {(summary.topicAccuracy || []).length === 0 ? (
                  <p className="mt-3 text-sm text-indigo-700/70">No topic data yet.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {(summary.topicAccuracy || []).map((x) => (
                      <li key={`${x.lane}::${x.topic}`}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-indigo-950">
                            {formatLabel(x.topic)} <span className="text-indigo-300">•</span>{' '}
                            <span className="text-indigo-700/80">{formatLabel(x.lane)}</span>
                          </span>
                          <span className="text-indigo-700/80">
                            {pct(x.accuracy)} <span className="text-indigo-300">•</span> {x.correct}/{x.total}
                          </span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-indigo-100">
                          <div
                            className="h-2 rounded-full bg-indigo-600"
                            style={{ width: `${Math.round((x.accuracy || 0) * 100)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

