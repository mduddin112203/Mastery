import { supabase } from './supabase'

function uniq(arr) {
  return Array.from(new Set(arr))
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
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

export async function getRandomPracticeQuestions({ lane = 'all', limit = 5 } = {}) {
  const { settings, error: settingsError } = await getUserSettings()
  if (settingsError) return { questions: [], error: settingsError }

  const level = settings.level
  const track = settings.track
  const language = settings.language

  const lanes = lane === 'all' ? ['code', 'system', 'behavioral'] : [lane]
  const perLane = Math.max(1, Math.ceil(limit / lanes.length))

  const queries = lanes.map((l) => {
    let q = supabase
      .from('questions')
      .select('id, lane, prompt, snippet, choices, answer_index, explanation, topic, difficulty')
      .eq('is_active', true)
      .eq('lane', l)
      .eq('level', level)
      .eq('track', track)

    if (l === 'code') q = q.eq('language', language)
    else q = q.is('language', null)

    return q.limit(50)
  })

  const results = await Promise.all(queries)
  const all = results.flatMap((r) => r.data || [])

  if (all.length === 0) {
    return { questions: [], error: 'No questions available for your settings.' }
  }

  const picked = shuffle(all).slice(0, limit)
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

  if (lane !== 'all') {
    q = q.eq('questions.lane', lane)
  }

  const { data, error } = await q
  if (error) return { questions: [], error: error.message }

  const seen = new Set()
  const missed = []
  for (const row of data || []) {
    const question = row.questions
    if (!question?.id) continue
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

  if (lane !== 'all') {
    q = q.eq('questions.lane', lane)
  }

  const { data, error } = await q
  if (error) return { questions: [], error: error.message }

  // Aggregate topic accuracy and track last confidence.
  const byTopic = new Map()
  const lastConfidenceByQuestion = new Map()

  for (const row of data || []) {
    const question = row.questions
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

