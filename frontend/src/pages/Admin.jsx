import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createQuestion,
  deleteQuestion,
  getAdminDashboardCounts,
  listQuestions,
  listReports,
  listUsersWithActivity,
  loadAdminAnalytics,
  resolveReport,
  setQuestionActive,
  updateQuestion,
} from '../services/adminService'

const TAB_OPTIONS = [
  { id: 'questions', label: 'Questions' },
  { id: 'users', label: 'Users' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'reports', label: 'Reports' },
]

const ADMIN_PAGE_SIZE = 25

const defaultQuestion = {
  lane: 'code',
  level: 'entry',
  track: 'general',
  language: 'javascript',
  topic: '',
  prompt: '',
  snippet: '',
  choices: '["A","B","C","D"]',
  answer_index: 0,
  explanation: '',
  difficulty: 2,
  is_active: true,
}

function fmtDate(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString()
}

function percent(value) {
  return `${Math.round((value || 0) * 100)}%`
}

function parseChoicesInput(raw) {
  try {
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-indigo-700/70">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-indigo-950">{value}</p>
      {hint ? <p className="mt-1 text-xs text-indigo-700/70">{hint}</p> : null}
    </div>
  )
}

function HorizontalBarList({ rows, labelKey, valueKey, meta }) {
  if (!rows?.length) {
    return <p className="text-sm text-indigo-700/80">No data yet.</p>
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const width = Math.max(0, Math.min(100, Math.round((row[valueKey] || 0) * 100)))
        return (
          <div key={`${row[labelKey]}-${row.total || row.correct || 0}`} className="rounded-lg border border-indigo-100 p-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-indigo-950">{row[labelKey]}</span>
              <span className="text-indigo-700/80">{meta(row)}</span>
            </div>
            <div className="mt-1 h-2 w-full rounded bg-indigo-100">
              <div className="h-2 rounded bg-indigo-600" style={{ width: `${width}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DailyTrend({ points }) {
  if (!points?.length) {
    return <p className="text-sm text-indigo-700/80">No trend data yet.</p>
  }

  const maxTotal = Math.max(...points.map((p) => p.total), 1)
  return (
    <div className="space-y-2">
      {points.map((p) => (
        <div key={p.date}>
          <div className="flex justify-between text-xs text-indigo-700/80">
            <span>{p.date}</span>
            <span>{p.total} attempts • {percent(p.accuracy)}</span>
          </div>
          <div className="mt-1 h-2 w-full rounded bg-indigo-100 overflow-hidden">
            <div className="h-2 bg-indigo-600" style={{ width: `${Math.round((p.total / maxTotal) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState('questions')
  const [error, setError] = useState(null)

  const [questions, setQuestions] = useState([])
  const [questionsTotal, setQuestionsTotal] = useState(0)
  const [qLoading, setQLoading] = useState(false)
  const [qPage, setQPage] = useState(1)
  const [qFilters, setQFilters] = useState({
    lane: 'all',
    level: 'all',
    track: 'all',
    language: 'all',
    topic: '',
    active: 'all',
  })
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(defaultQuestion)
  const [savingQuestion, setSavingQuestion] = useState(false)

  const [users, setUsers] = useState([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [uPage, setUPage] = useState(1)
  const [uLoading, setULoading] = useState(false)

  const [analytics, setAnalytics] = useState(null)
  const [aLoading, setALoading] = useState(false)
  const [analyticsDays, setAnalyticsDays] = useState(30)

  const [reports, setReports] = useState([])
  const [reportsTotal, setReportsTotal] = useState(0)
  const [rPage, setRPage] = useState(1)
  const [rLoading, setRLoading] = useState(false)
  const [reportStatus, setReportStatus] = useState('open')

  const [dashboardCounts, setDashboardCounts] = useState(null)
  const [resolvingId, setResolvingId] = useState(null)
  const [deactivatingId, setDeactivatingId] = useState(null)

  const loadQuestions = useCallback(async (pageOverride) => {
    const page = pageOverride ?? qPage
    setQLoading(true)
    setError(null)
    const { questions: data, total, error: err } = await listQuestions({
      ...qFilters,
      page,
      pageSize: ADMIN_PAGE_SIZE,
    })
    setQLoading(false)
    if (err) {
      setError(err)
      return
    }
    const maxPage = Math.max(1, Math.ceil((total || 0) / ADMIN_PAGE_SIZE))
    if (page > maxPage) {
      setQPage(maxPage)
      return
    }
    setQuestions(data)
    setQuestionsTotal(total)
  }, [qFilters, qPage])

  const loadDashboardCounts = useCallback(async () => {
    const data = await getAdminDashboardCounts({ days: 7 })
    if (data.error) return
    setDashboardCounts(data)
  }, [])

  const loadUsers = useCallback(async (pageOverride) => {
    const page = pageOverride ?? uPage
    setULoading(true)
    setError(null)
    const { users: data, total, error: err } = await listUsersWithActivity({
      days: 7,
      page,
      pageSize: ADMIN_PAGE_SIZE,
    })
    setULoading(false)
    if (err) {
      setError(err)
      return
    }
    const maxPage = Math.max(1, Math.ceil((total || 0) / ADMIN_PAGE_SIZE))
    if (page > maxPage) {
      setUPage(maxPage)
      return
    }
    setUsers(data)
    setUsersTotal(total)
  }, [uPage])

  const loadAnalytics = useCallback(async () => {
    setALoading(true)
    setError(null)
    const { analytics: data, error: err } = await loadAdminAnalytics({ days: analyticsDays })
    setALoading(false)
    if (err) {
      setError(err)
      return
    }
    setAnalytics(data)
  }, [analyticsDays])

  const loadReports = useCallback(async (pageOverride) => {
    const page = pageOverride ?? rPage
    setRLoading(true)
    setError(null)
    const { reports: data, total, error: err } = await listReports({
      status: reportStatus,
      page,
      pageSize: ADMIN_PAGE_SIZE,
    })
    setRLoading(false)
    if (err) {
      setError(err)
      return
    }
    const maxPage = Math.max(1, Math.ceil((total || 0) / ADMIN_PAGE_SIZE))
    if (page > maxPage) {
      setRPage(maxPage)
      return
    }
    setReports(data)
    setReportsTotal(total)
  }, [reportStatus, rPage])

  const patchFilters = useCallback((patch) => {
    setQFilters((v) => ({ ...v, ...patch }))
    setQPage(1)
  }, [])

  useEffect(() => {
    queueMicrotask(() => loadDashboardCounts())
  }, [loadDashboardCounts])

  useEffect(() => {
    if (tab !== 'users') return
    queueMicrotask(() => loadDashboardCounts())
  }, [tab, loadDashboardCounts])

  useEffect(() => {
    // Defer state updates to avoid react-hooks lint complaints about cascading renders.
    queueMicrotask(() => {
      if (tab === 'questions') loadQuestions()
      if (tab === 'users') loadUsers()
      if (tab === 'analytics') loadAnalytics()
      if (tab === 'reports') loadReports()
    })
  }, [tab, loadQuestions, loadUsers, loadAnalytics, loadReports])

  const maxQPage = useMemo(
    () => Math.max(1, Math.ceil((questionsTotal || 0) / ADMIN_PAGE_SIZE)),
    [questionsTotal],
  )
  const maxUPage = useMemo(
    () => Math.max(1, Math.ceil((usersTotal || 0) / ADMIN_PAGE_SIZE)),
    [usersTotal],
  )
  const maxRPage = useMemo(
    () => Math.max(1, Math.ceil((reportsTotal || 0) / ADMIN_PAGE_SIZE)),
    [reportsTotal],
  )
  const questionBankValue = tab === 'questions' ? questionsTotal : dashboardCounts?.questionBank
  const openReportsHint = useMemo(() => {
    const open = dashboardCounts?.openReports
    if (open == null) return 'Loading…'
    if (open === 0) return 'No pending reports'
    return `${open} pending review`
  }, [dashboardCounts?.openReports])
  const choicePreview = useMemo(() => parseChoicesInput(draft.choices), [draft.choices])

  const beginCreate = () => {
    setEditing(null)
    setDraft(defaultQuestion)
  }

  const beginEdit = (q) => {
    setEditing(q.id)
    setDraft({
      lane: q.lane,
      level: q.level,
      track: q.track,
      language: q.language || 'javascript',
      topic: q.topic || '',
      prompt: q.prompt || '',
      snippet: q.snippet || '',
      choices: JSON.stringify(q.choices || []),
      answer_index: q.answer_index ?? 0,
      explanation: q.explanation || '',
      difficulty: q.difficulty ?? 2,
      is_active: !!q.is_active,
    })
  }

  const saveQuestion = async () => {
    setSavingQuestion(true)
    setError(null)
    const action = editing ? updateQuestion(editing, draft) : createQuestion(draft)
    const { error: err } = await action
    setSavingQuestion(false)
    if (err) {
      setError(err)
      return
    }
    setEditing(null)
    setDraft(defaultQuestion)
    loadQuestions()
    loadDashboardCounts()
  }

  const toggleQuestion = async (q) => {
    const { error: err } = await setQuestionActive(q.id, !q.is_active)
    if (err) {
      setError(err)
      return
    }
    loadQuestions()
  }

  const removeQuestion = async (q) => {
    const confirmed = window.confirm('Permanently delete this question? This only works if it has no attempts or pack references.')
    if (!confirmed) return
    const { error: err } = await deleteQuestion(q.id)
    if (err) {
      setError(err)
      return
    }
    loadQuestions()
    loadDashboardCounts()
  }

  const handleResolve = async (rep) => {
    setResolvingId(rep.id)
    const { error: err } = await resolveReport(rep.id)
    setResolvingId(null)
    if (err) {
      setError(err)
      return
    }
    loadReports()
    loadDashboardCounts()
  }

  const handleDeactivateFromReport = async (rep) => {
    if (!rep?.questions?.id) return
    setDeactivatingId(rep.id)
    const { error: err } = await setQuestionActive(rep.questions.id, false)
    setDeactivatingId(null)
    if (err) {
      setError(err)
      return
    }
    loadReports()
  }

  return (
    <div className="min-h-screen bg-indigo-50/50 text-indigo-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold">Admin Control Center</h1>
        <p className="mt-1 text-sm text-indigo-700/80">Manage content quality, user health, analytics, and moderation workflows.</p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <MetricCard
            label="Question Bank"
            value={questionBankValue ?? '-'}
            hint={tab === 'questions' ? 'Matches filters above' : 'Total questions in database'}
          />
          <MetricCard
            label="Total users"
            value={dashboardCounts?.totalProfiles ?? '-'}
            hint="All registered profiles"
          />
          <MetricCard
            label="Active (7d)"
            value={dashboardCounts?.activeUsersWindow ?? '-'}
            hint="Users with ≥1 attempt in the last 7 days"
          />
          <MetricCard label="Open Reports" value={dashboardCounts?.openReports ?? '-'} hint={openReportsHint} />
          <MetricCard
            label="Attempts (window)"
            value={analytics?.sampleAttempts ?? '-'}
            hint={
              analytics?.attemptsTruncated
                ? 'High activity; figures use a summarized sample'
                : 'Matches the date range on the Analytics tab'
            }
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {TAB_OPTIONS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium border ${
                tab === t.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-indigo-800 border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {tab === 'questions' && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-indigo-200 bg-white p-4">
              <p className="text-sm font-semibold text-indigo-900">Filters</p>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-2">
                <select className="rounded border border-indigo-200 px-2 py-1.5 text-sm" value={qFilters.lane} onChange={(e) => patchFilters({ lane: e.target.value })}>
                  <option value="all">All lanes</option><option value="code">Code</option><option value="system">System</option><option value="behavioral">Behavioral</option>
                </select>
                <select className="rounded border border-indigo-200 px-2 py-1.5 text-sm" value={qFilters.level} onChange={(e) => patchFilters({ level: e.target.value })}>
                  <option value="all">All levels</option><option value="entry">Entry</option><option value="mid">Mid</option><option value="senior">Senior</option>
                </select>
                <select className="rounded border border-indigo-200 px-2 py-1.5 text-sm" value={qFilters.track} onChange={(e) => patchFilters({ track: e.target.value })}>
                  <option value="all">All tracks</option><option value="general">General</option><option value="frontend">Frontend</option><option value="backend">Backend</option>
                </select>
                <select className="rounded border border-indigo-200 px-2 py-1.5 text-sm" value={qFilters.language} onChange={(e) => patchFilters({ language: e.target.value })}>
                  <option value="all">All languages</option><option value="javascript">JavaScript</option><option value="python">Python</option><option value="java">Java</option><option value="null">No language</option>
                </select>
                <select className="rounded border border-indigo-200 px-2 py-1.5 text-sm" value={qFilters.active} onChange={(e) => patchFilters({ active: e.target.value })}>
                  <option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
                <input className="rounded border border-indigo-200 px-2 py-1.5 text-sm" placeholder="topic contains..." value={qFilters.topic} onChange={(e) => patchFilters({ topic: e.target.value })} />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQPage(1)
                    loadQuestions(1)
                  }}
                  className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white"
                >
                  Apply
                </button>
                <button type="button" onClick={beginCreate} className="rounded border border-indigo-200 px-3 py-1.5 text-sm text-indigo-800">New question</button>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-white p-4">
              <p className="text-sm font-semibold text-indigo-900">{editing ? 'Edit question' : 'Create question'}</p>
              <p className="mt-1 text-xs text-indigo-700/80">
                Fill top to bottom. Keep wording short and clear, like you are writing for a beginner.
              </p>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                <select className="rounded border border-indigo-200 px-2 py-1.5 text-sm" value={draft.lane} onChange={(e) => setDraft((v) => ({ ...v, lane: e.target.value }))}>
                  <option value="code">Code</option><option value="system">System</option><option value="behavioral">Behavioral</option>
                </select>
                <select className="rounded border border-indigo-200 px-2 py-1.5 text-sm" value={draft.level} onChange={(e) => setDraft((v) => ({ ...v, level: e.target.value }))}>
                  <option value="entry">Entry</option><option value="mid">Mid</option><option value="senior">Senior</option>
                </select>
                <select className="rounded border border-indigo-200 px-2 py-1.5 text-sm" value={draft.track} onChange={(e) => setDraft((v) => ({ ...v, track: e.target.value }))}>
                  <option value="general">General</option><option value="frontend">Frontend</option><option value="backend">Backend</option>
                </select>
                <select disabled={draft.lane !== 'code'} className="rounded border border-indigo-200 px-2 py-1.5 text-sm disabled:bg-slate-100" value={draft.language} onChange={(e) => setDraft((v) => ({ ...v, language: e.target.value }))}>
                  <option value="javascript">JavaScript</option><option value="python">Python</option><option value="java">Java</option>
                </select>
              </div>
              <p className="mt-2 text-xs text-indigo-700/80">
                Step 1: Pick lane, level, track, and language (language only matters for Code).
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2">
                <input className="rounded border border-indigo-200 px-2 py-1.5 text-sm" placeholder="Step 2: Topic (example: arrays, caching, teamwork)" value={draft.topic} onChange={(e) => setDraft((v) => ({ ...v, topic: e.target.value }))} />
                <textarea className="rounded border border-indigo-200 px-2 py-1.5 text-sm min-h-20" placeholder="Step 3: Question prompt (one clear question)." value={draft.prompt} onChange={(e) => setDraft((v) => ({ ...v, prompt: e.target.value }))} />
                <textarea className="rounded border border-indigo-200 px-2 py-1.5 text-sm min-h-16" placeholder="Step 4: Code snippet (optional)." value={draft.snippet} onChange={(e) => setDraft((v) => ({ ...v, snippet: e.target.value }))} />
                <textarea className="rounded border border-indigo-200 px-2 py-1.5 text-sm min-h-16 font-mono" placeholder={'Step 5: Answer options as JSON array\nExample: ["Option A", "Option B", "Option C", "Option D"]'} value={draft.choices} onChange={(e) => setDraft((v) => ({ ...v, choices: e.target.value }))} />
              </div>
              <p className="mt-1 text-xs text-indigo-700/80">
                Parsed options: {choicePreview.length} {choicePreview.length === 1 ? 'choice' : 'choices'}.
                {' '}Use 4 choices for most MCQs.
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <input type="number" className="rounded border border-indigo-200 px-2 py-1.5 text-sm" placeholder="Step 6: Correct answer index (starts at 0)" value={draft.answer_index} onChange={(e) => setDraft((v) => ({ ...v, answer_index: Number(e.target.value) }))} />
                <input type="number" min={1} max={3} className="rounded border border-indigo-200 px-2 py-1.5 text-sm" placeholder="Step 7: Difficulty (1 easy, 2 medium, 3 hard)" value={draft.difficulty} onChange={(e) => setDraft((v) => ({ ...v, difficulty: Number(e.target.value) }))} />
                <label className="flex items-center gap-2 text-sm text-indigo-800"><input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft((v) => ({ ...v, is_active: e.target.checked }))} /> Active</label>
              </div>
              <textarea className="mt-2 rounded border border-indigo-200 px-2 py-1.5 text-sm min-h-16 w-full" placeholder="Step 8: Explanation (why the correct option is right)." value={draft.explanation} onChange={(e) => setDraft((v) => ({ ...v, explanation: e.target.value }))} />
              <p className="mt-2 text-xs text-indigo-700/80">
                Tip: If choices are A/B/C/D, and B is correct, answer index should be <span className="font-semibold">1</span>.
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={saveQuestion} disabled={savingQuestion} className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">
                  {savingQuestion ? 'Saving…' : editing ? 'Update question' : 'Create question now'}
                </button>
                <button type="button" onClick={beginCreate} className="rounded border border-indigo-200 px-3 py-1.5 text-sm text-indigo-800">Reset</button>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-indigo-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-indigo-900">Questions ({questionsTotal})</p>
                <div className="flex flex-col items-end gap-1 text-sm sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-xs text-indigo-700/80">
                    {questionsTotal > 0
                      ? `Showing ${(qPage - 1) * ADMIN_PAGE_SIZE + 1}–${Math.min(qPage * ADMIN_PAGE_SIZE, questionsTotal)} of ${questionsTotal}`
                      : 'No questions match filters'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={qPage <= 1} onClick={() => setQPage((p) => Math.max(1, p - 1))} className="rounded border border-indigo-200 px-2 py-1 disabled:opacity-50">Prev</button>
                    <span>Page {qPage} / {maxQPage}</span>
                    <button type="button" disabled={qPage >= maxQPage} onClick={() => setQPage((p) => Math.min(maxQPage, p + 1))} className="rounded border border-indigo-200 px-2 py-1 disabled:opacity-50">Next</button>
                  </div>
                </div>
              </div>
              {qLoading ? (
                <p className="p-4 text-sm text-indigo-700/80">Loading questions…</p>
              ) : (
                <div className="divide-y divide-indigo-100">
                  {questions.map((q) => (
                    <div key={q.id} className="p-4">
                      <p className="text-xs text-indigo-700/80">{q.lane} • {q.level} • {q.track} • {q.language || 'n/a'} • {q.topic}</p>
                      <p className="mt-1 font-medium text-indigo-950">{q.prompt}</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => beginEdit(q)} className="rounded border border-indigo-200 px-2 py-1 text-xs text-indigo-800">Edit</button>
                        <button type="button" onClick={() => toggleQuestion(q)} className="rounded border border-indigo-200 px-2 py-1 text-xs text-indigo-800">
                          {q.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button type="button" onClick={() => removeQuestion(q)} className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {questions.length === 0 && <p className="p-4 text-sm text-indigo-700/80">No questions found.</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="mt-6 rounded-xl border border-indigo-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 border-b border-indigo-100 bg-indigo-50/70 text-sm text-indigo-900">
              <span className="font-semibold">Total users:</span>{' '}
              {dashboardCounts?.totalProfiles ?? usersTotal ?? '—'}
              <span className="mx-2 text-indigo-400">·</span>
              <span className="font-semibold">Active (7d):</span>{' '}
              {dashboardCounts?.activeUsersWindow ?? '—'}
              <span className="block mt-1 text-xs text-indigo-700/80 font-normal">
                Each row shows that account's practice activity and last active time (rolling 7 days).
              </span>
            </div>
            <div className="px-4 py-3 border-b border-indigo-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-indigo-900">User directory ({usersTotal} total)</p>
                <p className="text-xs text-indigo-700/80">Activity counts are for the last 7 days.</p>
              </div>
              <div className="flex flex-col items-end gap-1 text-sm sm:flex-row sm:items-center sm:gap-3">
                <span className="text-xs text-indigo-700/80">
                  {usersTotal > 0
                    ? `Showing ${(uPage - 1) * ADMIN_PAGE_SIZE + 1}–${Math.min(uPage * ADMIN_PAGE_SIZE, usersTotal)} of ${usersTotal}`
                    : 'No users'}
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={uPage <= 1} onClick={() => setUPage((p) => Math.max(1, p - 1))} className="rounded border border-indigo-200 px-2 py-1 text-xs disabled:opacity-50">Prev</button>
                  <span className="text-xs">Page {uPage} / {maxUPage}</span>
                  <button type="button" disabled={uPage >= maxUPage} onClick={() => setUPage((p) => Math.min(maxUPage, p + 1))} className="rounded border border-indigo-200 px-2 py-1 text-xs disabled:opacity-50">Next</button>
                  <button type="button" onClick={() => loadUsers()} className="rounded border border-indigo-200 px-2 py-1 text-xs text-indigo-800">Refresh</button>
                </div>
              </div>
            </div>
            {uLoading ? (
              <p className="p-4 text-sm text-indigo-700/80">Loading users…</p>
            ) : (
              <div className="divide-y divide-indigo-100">
                {users.map((u) => (
                  <div key={u.id} className="p-4 text-sm">
                    <p className="text-indigo-950">{u.email || 'email not available'}</p>
                    <p className="font-medium text-indigo-950">{u.id}</p>
                    <p className="text-indigo-700/80">role: <span className={u.role === 'admin' ? 'font-semibold text-indigo-900' : ''}>{u.role}</span> • created: {fmtDate(u.created_at)}</p>
                    <p className="text-indigo-700/80">settings: {u.settings ? `${u.settings.goal} / ${u.settings.level} / ${u.settings.track} / ${u.settings.language}` : 'none'}</p>
                    <p className="text-indigo-700/80">attempts(7d): {u.attempts_last_window} • last active: {fmtDate(u.last_active_at)}</p>
                  </div>
                ))}
                {users.length === 0 && <p className="p-4 text-sm text-indigo-700/80">No users found.</p>}
              </div>
            )}
          </div>
        )}

        {tab === 'analytics' && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-indigo-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-indigo-900">Window</label>
                <select value={String(analyticsDays)} onChange={(e) => setAnalyticsDays(Number(e.target.value))} className="rounded border border-indigo-200 px-2 py-1.5 text-sm">
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                </select>
                <button type="button" onClick={loadAnalytics} className="rounded border border-indigo-200 px-2 py-1 text-xs text-indigo-800">Refresh</button>
              </div>
              {aLoading ? (
                <p className="mt-3 text-sm text-indigo-700/80">Loading analytics…</p>
              ) : analytics ? (
                <p className="mt-3 text-sm text-indigo-700/80">
                  Attempts in selected window: {analytics.sampleAttempts}
                  {analytics.attemptsTruncated ? ' — summary based on a large activity period' : ''}
                </p>
              ) : null}
            </div>

            {analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-indigo-200 bg-white p-4">
                  <p className="font-semibold text-sm text-indigo-900">Daily Attempts Trend</p>
                  <div className="mt-2 max-h-80 overflow-y-auto pr-1">
                    <DailyTrend points={analytics.dailySeries || []} />
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-200 bg-white p-4">
                  <p className="font-semibold text-sm text-indigo-900">Lane Accuracy (Chart)</p>
                  <div className="mt-2">
                    <HorizontalBarList
                      rows={analytics.laneStats || []}
                      labelKey="lane"
                      valueKey="accuracy"
                      meta={(x) => `${percent(x.accuracy)} • ${x.correct}/${x.total}`}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-200 bg-white p-4">
                  <p className="font-semibold text-sm text-indigo-900">Weakest Topics (Chart)</p>
                  <div className="mt-2">
                    <HorizontalBarList
                      rows={analytics.topicStats || []}
                      labelKey="topic"
                      valueKey="accuracy"
                      meta={(x) => `${x.lane} • ${percent(x.accuracy)} • ${x.correct}/${x.total}`}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-200 bg-white p-4">
                  <p className="font-semibold text-sm text-indigo-900">Hardest vs Easiest Questions</p>
                  <div className="mt-2 grid grid-cols-1 gap-3 text-sm">
                    <div>
                      <p className="font-medium text-indigo-900">Hardest</p>
                      <ul className="mt-1 space-y-1">
                        {(analytics.hardest || []).slice(0, 10).map((x) => (
                          <li key={x.id} className="text-indigo-700/90">
                            {percent(x.accuracy)} • {x.prompt}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-indigo-900">Easiest</p>
                      <ul className="mt-1 space-y-1">
                        {(analytics.easiest || []).slice(0, 10).map((x) => (
                          <li key={x.id} className="text-indigo-700/90">
                            {percent(x.accuracy)} • {x.prompt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'reports' && (
          <div className="mt-6 rounded-xl border border-indigo-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-indigo-100 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm font-semibold text-indigo-900">Reports ({reportsTotal})</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={reportStatus}
                    onChange={(e) => {
                      setReportStatus(e.target.value)
                      setRPage(1)
                    }}
                    className="rounded border border-indigo-200 px-2 py-1.5 text-sm"
                  >
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                    <option value="all">All</option>
                  </select>
                  <button type="button" onClick={() => loadReports()} className="rounded border border-indigo-200 px-2 py-1 text-xs text-indigo-800">Refresh</button>
                </div>
                <div className="flex flex-col items-end gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
                  <span className="text-xs text-indigo-700/80">
                    {reportsTotal > 0
                      ? `Showing ${(rPage - 1) * ADMIN_PAGE_SIZE + 1}–${Math.min(rPage * ADMIN_PAGE_SIZE, reportsTotal)} of ${reportsTotal}`
                      : 'No reports in this filter'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={rPage <= 1} onClick={() => setRPage((p) => Math.max(1, p - 1))} className="rounded border border-indigo-200 px-2 py-1 text-xs disabled:opacity-50">Prev</button>
                    <span className="text-xs">Page {rPage} / {maxRPage}</span>
                    <button type="button" disabled={rPage >= maxRPage} onClick={() => setRPage((p) => Math.min(maxRPage, p + 1))} className="rounded border border-indigo-200 px-2 py-1 text-xs disabled:opacity-50">Next</button>
                  </div>
                </div>
              </div>
            </div>
            {rLoading ? (
              <p className="p-4 text-sm text-indigo-700/80">Loading reports…</p>
            ) : (
              <div className="divide-y divide-indigo-100">
                {reports.map((rep) => (
                  <div key={rep.id} className="p-4">
                    <p className="text-xs text-indigo-700/80">{fmtDate(rep.created_at)} • status: {rep.status || 'open'}</p>
                    <p className="mt-1 text-sm text-indigo-950">Reason: {rep.reason}</p>
                    <p className="text-sm text-indigo-700/80">Question: {rep.questions?.prompt || rep.question_id}</p>
                    <p className="text-xs text-indigo-700/70">Lane: {rep.questions?.lane || '-'} • Topic: {rep.questions?.topic || '-'}</p>
                    <div className="mt-2 flex gap-2">
                      {rep.questions?.id && (
                        <button
                          type="button"
                          onClick={() => handleDeactivateFromReport(rep)}
                          disabled={deactivatingId === rep.id}
                          className="rounded border border-indigo-200 px-2 py-1 text-xs text-indigo-800 disabled:opacity-50"
                        >
                          {deactivatingId === rep.id ? 'Deactivating…' : 'Deactivate question'}
                        </button>
                      )}
                      {(rep.status || 'open') !== 'resolved' && (
                        <button
                          type="button"
                          onClick={() => handleResolve(rep)}
                          disabled={resolvingId === rep.id}
                          className="rounded bg-indigo-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                        >
                          {resolvingId === rep.id ? 'Resolving…' : 'Mark resolved'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {reports.length === 0 && <p className="p-4 text-sm text-indigo-700/80">No reports.</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

