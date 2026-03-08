/**
 * Daily pack: get or create today's pack, then load items with questions.
 * Uses Grok AI first (Edge Function) when VITE_EDGE_FUNCTIONS_URL is set; only then falls back to seed bank via RPC.
 */

import { supabase } from './supabase'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Get or create today's pack for the current user.
 * @returns { packId, source: 'ai'|'seed'|'existing', error? }
 */
export async function getOrCreateTodayPack() {
  const authHeader = (await supabase.auth.getSession()).data?.session?.access_token
  if (!authHeader) {
    return { packId: null, source: null, error: 'Not signed in' }
  }

  const packDate = todayISO()
  const edgeUrl = import.meta.env.VITE_EDGE_FUNCTIONS_URL || null

  if (edgeUrl) {
    try {
      const res = await fetch(`${edgeUrl}/generate-daily-pack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authHeader}`,
        },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return {
          packId: null,
          source: null,
          error: data?.error || res.statusText || 'Failed to generate pack',
        }
      }
      if (data.pack_id) {
        return { packId: data.pack_id, source: data.source || 'seed', error: null }
      }
    } catch (e) {
      console.warn('Edge function failed, falling back to RPC', e)
    }
  }

  const { data: packId, error: rpcError } = await supabase.rpc('generate_daily_pack', {
    p_pack_date: packDate,
  })

  if (rpcError) {
    return { packId: null, source: null, error: rpcError.message }
  }
  const id = typeof packId === 'string' ? packId : packId?.[0] ?? packId
  return { packId: id ?? null, source: 'seed', error: null }
}

/**
 * Load pack items with full question details for a pack id.
 * @param {string} packId
 * @returns { items: Array<{ id, lane, position, question }>, error? }
 */
export async function getPackWithQuestions(packId) {
  if (!packId) {
    return { items: [], error: 'No pack id' }
  }

  const { data: items, error } = await supabase
    .from('daily_pack_items')
    .select(`
      id,
      lane,
      position,
      questions (
        id,
        prompt,
        snippet,
        choices,
        answer_index,
        explanation,
        topic,
        difficulty
      )
    `)
    .eq('pack_id', packId)
    .order('position', { ascending: true })

  if (error) {
    return { items: [], error: error.message }
  }

  const normalized = (items || []).map((row) => ({
    id: row.id,
    lane: row.lane,
    position: row.position,
    question: row.questions,
  }))

  return { items: normalized, error: null }
}

/**
 * One-shot: get or create today's pack and load its questions.
 * If pack is already completed, includes attempt data for read-only view.
 * @returns { packId, items, completedAt, packDate, error? }
 */
export async function loadTodayPack() {
  const { packId, error: packError } = await getOrCreateTodayPack()
  if (packError || !packId) {
    return { packId: null, items: [], completedAt: false, packDate: null, error: packError || 'No pack' }
  }

  const { data: packRow } = await supabase
    .from('daily_packs')
    .select('completed_at, pack_date')
    .eq('id', packId)
    .single()

  const completedAt = !!packRow?.completed_at
  const packDate = packRow?.pack_date || null

  const { items, error: itemsError } = await getPackWithQuestions(packId)
  if (itemsError) {
    return { packId, items: [], completedAt: false, packDate, error: itemsError }
  }

  if (completedAt && items.length > 0) {
    const { data: attempts } = await supabase
      .from('attempts')
      .select('question_id, selected_index, is_correct, confidence')
      .eq('pack_id', packId)
    const byQuestion = (attempts || []).reduce((acc, a) => {
      acc[a.question_id] = a
      return acc
    }, {})
    const itemsWithAttempts = items.map((it) => ({
      ...it,
      attempt: it.question?.id ? byQuestion[it.question.id] ?? null : null,
    }))
    return { packId, items: itemsWithAttempts, completedAt: true, packDate, error: null }
  }

  return { packId, items, completedAt: false, packDate, error: null }
}

/**
 * Submit an attempt for a question in a pack.
 * @param {Object} p
 * @param {string} p.packId
 * @param {string} p.questionId
 * @param {number} p.selectedIndex
 * @param {boolean} p.isCorrect
 * @param {'easy'|'ok'|'hard'|null} p.confidence
 * @param {number|null} p.timeSpentSec
 */
export async function submitAttempt({ packId, questionId, selectedIndex, isCorrect, confidence, timeSpentSec }) {
  const { data: { user: u } } = await supabase.auth.getUser()
  if (!u?.id) {
    return { error: 'Not signed in' }
  }
  const { error } = await supabase.from('attempts').insert({
    user_id: u.id,
    pack_id: packId,
    question_id: questionId,
    selected_index: selectedIndex,
    is_correct: isCorrect,
    confidence: confidence ?? null,
    time_spent_sec: timeSpentSec ?? null,
  })
  return { error: error?.message || null }
}

/**
 * Mark a pack as completed (set completed_at).
 */
export async function completePack(packId) {
  const { error } = await supabase
    .from('daily_packs')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', packId)
  return { error: error?.message || null }
}

/**
 * List previous pack dates (for "View past days").
 * @returns { packs: Array<{ id, pack_date }>, error? }
 */
export async function getPreviousPacks() {
  const { data: { user: u } } = await supabase.auth.getUser()
  if (!u?.id) return { packs: [], error: 'Not signed in' }
  const today = todayISO()
  const { data, error } = await supabase
    .from('daily_packs')
    .select('id, pack_date')
    .eq('user_id', u.id)
    .lt('pack_date', today)
    .order('pack_date', { ascending: false })
    .limit(30)
  return { packs: data || [], error: error?.message || null }
}

/**
 * Load a pack for read-only review (e.g. today completed or a past day).
 * @returns { pack: { id, pack_date, completed_at }, items: Array<{ ...item, attempt }>, error? }
 */
export async function loadPackForReview(packId) {
  if (!packId) return { pack: null, items: [], error: 'No pack id' }
  const { data: packRow, error: packErr } = await supabase
    .from('daily_packs')
    .select('id, pack_date, completed_at')
    .eq('id', packId)
    .single()
  if (packErr || !packRow) {
    return { pack: null, items: [], error: packErr?.message || 'Pack not found' }
  }
  const { items, error: itemsError } = await getPackWithQuestions(packId)
  if (itemsError) return { pack: packRow, items: [], error: itemsError }
  const { data: attempts } = await supabase
    .from('attempts')
    .select('question_id, selected_index, is_correct, confidence')
    .eq('pack_id', packId)
  const byQuestion = (attempts || []).reduce((acc, a) => {
    acc[a.question_id] = a
    return acc
  }, {})
  const itemsWithAttempts = items.map((it) => ({
    ...it,
    attempt: it.question?.id ? byQuestion[it.question.id] ?? null : null,
  }))
  return { pack: packRow, items: itemsWithAttempts, error: null }
}
