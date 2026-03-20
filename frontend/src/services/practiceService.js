import { supabase } from './supabase'

function shuffle(arr) {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export async function getUserSettings() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return { settings: null, error: 'Not signed in' }

  const { data, error } = await supabase
    .from('user_settings')
    .select('level, track, language')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return { settings: null, error: error.message }

  return {
    settings: {
      level: data?.level || 'entry',
      track: data?.track || 'general',
      language: data?.language || 'javascript',
    },
    error: null,
  }
}

async function fetchQuestionsWithFallback({
  lane,
  level,
  track,
  language,
  limit = 50,
  targetCount = 1,
}) {
  const base = supabase
    .from('questions')
    .select('id, lane, prompt, snippet, choices, answer_index, explanation, topic, difficulty, level, track, language')
    .eq('is_active', true)
    .eq('lane', lane)

  // For each lane, try more specific filters first, then relax.
  const attempts = []

  if (lane === 'code') {
    // 1) level + track + language
    attempts.push(base.eq('level', level).eq('track', track).eq('language', language))
    // 2) level + language (any track)
    attempts.push(base.eq('level', level).eq('language', language))
    // 3) level (any track/any language)
    attempts.push(base.eq('level', level))
  } else {
    // system/behavioral use language=null in our schema
    const withLang = base.is('language', null)
    // 1) level + track
    attempts.push(withLang.eq('level', level).eq('track', track))
    // 2) level (any track)
    attempts.push(withLang.eq('level', level))
    // 3) any level (any track) — keep language null
    attempts.push(withLang)
  }

  // Accumulate results across attempts until we reach targetCount or run out of attempts.
  const pool = []
  const seen = new Set()

  for (const q of attempts) {
    const { data, error } = await q.limit(limit)
    if (error) return { questions: [], error: error.message }

    for (const row of data || []) {
      const id = row?.id
      if (!id || seen.has(id)) continue
      seen.add(id)
      pool.push(row)
      if (pool.length >= targetCount) {
        break
      }
    }

    if (pool.length >= targetCount) break
  }

  return { questions: pool, error: null }
}

export async function getRandomPracticeQuestions({ lane = 'all', limit = 5 } = {}) {
  const { settings, error: settingsError } = await getUserSettings()
  if (settingsError) return { questions: [], error: settingsError }

  const level = settings.level
  const track = settings.track
  const language = settings.language

  const lanes = lane === 'all' ? ['code', 'system', 'behavioral'] : [lane]
  const perLane = Math.max(1, Math.ceil(limit / lanes.length))

  const results = await Promise.all(
    lanes.map((l) =>
      fetchQuestionsWithFallback({
        lane: l,
        level,
        track,
        language,
        limit: 100,
        targetCount: perLane,
      }),
    ),
  )
  const all = results.flatMap((r) => r.questions || [])

  if (all.length === 0) {
    return { questions: [], error: 'No questions available for your settings.' }
  }

  // Keep some balance across lanes when lane=all by picking per-lane first.
  let picked = []
  if (lane === 'all') {
    for (const l of lanes) {
      const group = all.filter((q) => q.lane === l)
      picked = picked.concat(shuffle(group).slice(0, perLane))
    }
  } else {
    picked = all
  }

  picked = shuffle(picked).slice(0, limit)
  return { questions: picked, error: null }
}

export async function getMissedQuestions({ lane = 'all', limit = 10 } = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return { questions: [], error: 'Not signed in' }

  // Pull recent incorrect attempts with question metadata so we can de-dupe by question.
  let q = supabase
    .from('attempts')
    .select(
      `
      question_id,
      created_at,
      questions (
        id,
        lane,
        prompt,
        snippet,
        choices,
        answer_index,
        explanation,
        topic,
        difficulty
      )
    `,
    )
    .eq('user_id', user.id)
    .eq('is_correct', false)
    .order('created_at', { ascending: false })
    .limit(200)

  const { data, error } = await q
  if (error) return { questions: [], error: error.message }

  const seen = new Set()
  const missed = []
  for (const row of data || []) {
    const question = row.questions
    if (!question?.id) continue
    if (lane !== 'all' && question.lane !== lane) continue
    if (seen.has(question.id)) continue
    seen.add(question.id)
    missed.push(question)
    if (missed.length >= limit) break
  }

  if (missed.length === 0) {
    return { questions: [], error: 'No missed questions yet.' }
  }

  return { questions: missed, error: null }
}

export async function getWeakTopicQuestions({ lane = 'all', limit = 10 } = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return { questions: [], error: 'Not signed in' }

  // Pull recent attempts joined with questions to compute accuracy per topic and detect last "hard".
  let q = supabase
    .from('attempts')
    .select(
      `
      question_id,
      is_correct,
      confidence,
      created_at,
      questions (
        id,
        lane,
        topic,
        prompt,
        snippet,
        choices,
        answer_index,
        explanation,
        difficulty
      )
    `,
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(800)

  const { data, error } = await q
  if (error) return { questions: [], error: error.message }

  // Aggregate topic accuracy and track last confidence.
  const byTopic = new Map()
  const lastConfidenceByQuestion = new Map()

  for (const row of data || []) {
    const question = row.questions
    if (lane !== 'all' && question?.lane !== lane) continue
    if (!question?.topic) continue
    const key = `${question.lane}::${question.topic}`
    const agg = byTopic.get(key) || { lane: question.lane, topic: question.topic, total: 0, correct: 0 }
    agg.total += 1
    if (row.is_correct) agg.correct += 1
    byTopic.set(key, agg)

    if (!lastConfidenceByQuestion.has(question.id)) {
      lastConfidenceByQuestion.set(question.id, row.confidence ?? null)
    }
  }

  const weakTopics = new Set()
  for (const [key, agg] of byTopic.entries()) {
    const acc = agg.total ? agg.correct / agg.total : 0
    if (acc < 0.7) weakTopics.add(key)
  }

  // Build a candidate list of questions in weak topics OR whose last confidence was "hard".
  const candidates = []
  const seenQuestions = new Set()
  for (const row of data || []) {
    const question = row.questions
    if (lane !== 'all' && question?.lane !== lane) continue
    if (!question?.id || !question?.topic) continue
    if (seenQuestions.has(question.id)) continue
    seenQuestions.add(question.id)

    const topicKey = `${question.lane}::${question.topic}`
    const lastConf = lastConfidenceByQuestion.get(question.id)
    if (weakTopics.has(topicKey) || lastConf === 'hard') {
      candidates.push(question)
    }
  }

  if (candidates.length === 0) {
    return { questions: [], error: 'No weak topics detected yet. Do a few sessions first.' }
  }

  const picked = shuffle(candidates).slice(0, limit)
  return { questions: picked, error: null }
}

