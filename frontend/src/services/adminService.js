import { supabase } from './supabase'

function toNumber(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function parseLooseChoices(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw !== 'string') return []

  const txt = raw.trim()
  if (!txt) return []

  try {
    const parsed = JSON.parse(txt)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // Fallback for AI/plain text output formats.
  }

  return txt
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/, '').replace(/^\d+[\).:-]?\s*/, '').trim())
}

export async function listQuestions({
  lane = 'all',
  level = 'all',
  track = 'all',
  language = 'all',
  topic = '',
  active = 'all',
  page = 1,
  pageSize = 25,
} = {}) {
  const from = (Math.max(1, page) - 1) * pageSize
  const to = from + pageSize - 1

  let q = supabase
    .from('questions')
    .select(
      'id, lane, level, track, language, topic, prompt, snippet, choices, answer_index, explanation, difficulty, is_active, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (lane !== 'all') q = q.eq('lane', lane)
  if (level !== 'all') q = q.eq('level', level)
  if (track !== 'all') q = q.eq('track', track)
  if (language !== 'all') {
    if (language === 'null') q = q.is('language', null)
    else q = q.eq('language', language)
  }
  if (active !== 'all') q = q.eq('is_active', active === 'active')
  if (topic.trim()) q = q.ilike('topic', `%${topic.trim()}%`)

  const { data, error, count } = await q
  if (error) return { questions: [], total: 0, error: error.message }
  return { questions: data || [], total: count || 0, error: null }
}

function validateQuestionInput(input) {
  const errors = []
  const lane = input?.lane
  const level = input?.level
  const track = input?.track
  const topic = (input?.topic || '').trim()
  const prompt = (input?.prompt || '').trim()
  const explanation = (input?.explanation || '').trim()
  const difficulty = toNumber(input?.difficulty, 2)
  const answerIndex = toNumber(input?.answer_index, -1)

  if (!['code', 'system', 'behavioral'].includes(lane)) errors.push('Lane is required.')
  if (!['entry', 'mid', 'senior'].includes(level)) errors.push('Level is required.')
  if (!['general', 'frontend', 'backend'].includes(track)) errors.push('Track is required.')
  if (!topic) errors.push('Topic is required.')
  if (!prompt) errors.push('Prompt is required.')
  if (!explanation) errors.push('Explanation is required.')
  if (difficulty < 1 || difficulty > 3) errors.push('Difficulty must be 1-3.')

  let choices = parseLooseChoices(input?.choices)
  if (!Array.isArray(choices) || choices.length < 2) {
    errors.push('Choices need at least 2 options.')
  }
  if (Array.isArray(choices) && (answerIndex < 0 || answerIndex >= choices.length)) {
    errors.push('Answer index is out of bounds.')
  }

  let language = input?.language ?? null
  if (lane !== 'code') language = null
  if (lane === 'code' && !['python', 'javascript', 'java'].includes(language)) {
    errors.push('Code questions require a valid language.')
  }

  return {
    valid: errors.length === 0,
    errors,
    payload: {
      lane,
      level,
      track,
      language,
      topic,
      prompt,
      snippet: input?.snippet?.trim() || null,
      choices,
      answer_index: answerIndex,
      explanation,
      difficulty,
      is_active: input?.is_active ?? true,
    },
  }
}

export async function createQuestion(input) {
  const parsed = validateQuestionInput(input)
  if (!parsed.valid) return { question: null, error: parsed.errors.join(' ') }
  const { data, error } = await supabase
    .from('questions')
    .insert(parsed.payload)
    .select('*')
    .single()
  if (error) return { question: null, error: error.message }
  return { question: data, error: null }
}

export async function updateQuestion(id, input) {
  const parsed = validateQuestionInput(input)
  if (!parsed.valid) return { question: null, error: parsed.errors.join(' ') }
  const { data, error } = await supabase
    .from('questions')
    .update(parsed.payload)
    .eq('id', id)
    .select('*')
    .single()
  if (error) return { question: null, error: error.message }
  return { question: data, error: null }
}

export async function setQuestionActive(id, isActive) {
  const { error } = await supabase
    .from('questions')
    .update({ is_active: !!isActive })
    .eq('id', id)
  return { error: error?.message || null }
}

export async function deleteQuestion(id) {
  if (!id) return { error: 'Missing question id' }

  const [{ count: attemptCount, error: attemptsErr }, { count: packItemCount, error: packErr }] = await Promise.all([
    supabase
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('question_id', id),
    supabase
      .from('daily_pack_items')
      .select('id', { count: 'exact', head: true })
      .eq('question_id', id),
  ])

  if (attemptsErr) return { error: attemptsErr.message }
  if (packErr) return { error: packErr.message }

  if ((attemptCount || 0) > 0 || (packItemCount || 0) > 0) {
    return { error: 'Cannot delete: question is referenced by attempts or packs. Deactivate it instead.' }
  }

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)
  return { error: error?.message || null }
}

export async function listUsersWithActivity({ days = 7 } = {}) {
  let { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  // Backward compatibility: older DBs may not have profiles.email yet.
  if (profilesErr?.message?.toLowerCase().includes('column profiles.email does not exist')) {
    const fallback = await supabase
      .from('profiles')
      .select('id, role, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    profiles = fallback.data
    profilesErr = fallback.error
  }

  if (profilesErr) return { users: [], error: profilesErr.message }

  const userIds = (profiles || []).map((p) => p.id)
  if (userIds.length === 0) return { users: [], error: null }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('user_id, goal, level, track, language')
    .in('user_id', userIds)

  const since = new Date()
  since.setDate(since.getDate() - Math.max(1, Number(days) || 7))
  const sinceIso = since.toISOString()

  const { data: attempts } = await supabase
    .from('attempts')
    .select('user_id, created_at')
    .in('user_id', userIds)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })

  const settingsByUser = new Map((settings || []).map((s) => [s.user_id, s]))
  const statsByUser = new Map()
  for (const a of attempts || []) {
    const prev = statsByUser.get(a.user_id) || { attempts: 0, last_active_at: null }
    prev.attempts += 1
    if (!prev.last_active_at || a.created_at > prev.last_active_at) prev.last_active_at = a.created_at
    statsByUser.set(a.user_id, prev)
  }

  const users = (profiles || []).map((p) => ({
    id: p.id,
    email: p.email || null,
    role: p.role,
    created_at: p.created_at,
    settings: settingsByUser.get(p.id) || null,
    attempts_last_window: statsByUser.get(p.id)?.attempts || 0,
    last_active_at: statsByUser.get(p.id)?.last_active_at || null,
  }))

  return { users, error: null }
}

export async function loadAdminAnalytics({ days = 30 } = {}) {
  const since = new Date()
  since.setDate(since.getDate() - Math.max(1, Number(days) || 30))
  const sinceIso = since.toISOString()

  const { data: attempts, error } = await supabase
    .from('attempts')
    .select(
      `
      is_correct,
      created_at,
      question_id,
      questions (
        id,
        lane,
        topic,
        prompt
      )
    `,
    )
    .gte('created_at', sinceIso)
    .limit(5000)

  if (error) return { analytics: null, error: error.message }

  const laneAgg = new Map()
  const topicAgg = new Map()
  const questionAgg = new Map()
  const dailyAgg = new Map()

  for (const row of attempts || []) {
    const q = row.questions
    if (!q?.id) continue

    const dateKey = row.created_at ? row.created_at.slice(0, 10) : null
    if (dateKey) {
      const day = dailyAgg.get(dateKey) || { date: dateKey, total: 0, correct: 0 }
      day.total += 1
      if (row.is_correct) day.correct += 1
      dailyAgg.set(dateKey, day)
    }

    const lane = q.lane || 'unknown'
    const laneStat = laneAgg.get(lane) || { lane, total: 0, correct: 0 }
    laneStat.total += 1
    if (row.is_correct) laneStat.correct += 1
    laneAgg.set(lane, laneStat)

    const topicKey = `${lane}::${q.topic || 'unknown'}`
    const topicStat = topicAgg.get(topicKey) || { lane, topic: q.topic || 'unknown', total: 0, correct: 0 }
    topicStat.total += 1
    if (row.is_correct) topicStat.correct += 1
    topicAgg.set(topicKey, topicStat)

    const qStat = questionAgg.get(q.id) || {
      id: q.id,
      lane,
      topic: q.topic || 'unknown',
      prompt: q.prompt || '',
      total: 0,
      correct: 0,
    }
    qStat.total += 1
    if (row.is_correct) qStat.correct += 1
    questionAgg.set(q.id, qStat)
  }

  const laneStats = Array.from(laneAgg.values()).map((x) => ({
    ...x,
    accuracy: x.total ? x.correct / x.total : 0,
  }))

  const topicStats = Array.from(topicAgg.values())
    .map((x) => ({ ...x, accuracy: x.total ? x.correct / x.total : 0 }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 15)

  const eligibleQuestions = Array.from(questionAgg.values())
    .filter((x) => x.total >= 3)
    .map((x) => ({ ...x, accuracy: x.total ? x.correct / x.total : 0 }))

  const hardest = [...eligibleQuestions].sort((a, b) => a.accuracy - b.accuracy).slice(0, 10)
  const easiest = [...eligibleQuestions].sort((a, b) => b.accuracy - a.accuracy).slice(0, 10)
  const dailySeries = Array.from(dailyAgg.values())
    .map((x) => ({
      ...x,
      accuracy: x.total ? x.correct / x.total : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    analytics: {
      laneStats,
      topicStats,
      hardest,
      easiest,
      dailySeries,
      sampleAttempts: (attempts || []).length,
    },
    error: null,
  }
}

export async function listReports({ status = 'all' } = {}) {
  let q = supabase
    .from('reports')
    .select(
      `
      id,
      user_id,
      question_id,
      reason,
      created_at,
      status,
      resolved_at,
      resolved_by,
      questions (
        id,
        lane,
        level,
        topic,
        prompt,
        is_active
      )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (status !== 'all') q = q.eq('status', status)

  const { data, error } = await q
  if (error) return { reports: [], error: error.message }
  return { reports: data || [], error: null }
}

export async function resolveReport(reportId) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('reports')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: user?.id || null,
    })
    .eq('id', reportId)
  return { error: error?.message || null }
}

