import { supabase } from './supabase'

function isoDate(d) {
  return new Date(d).toISOString().slice(0, 10)
}

function dayStartISO(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.toISOString()
}

function rangeDaysBack(n) {
  const out = []
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    out.push(d)
  }
  return out
}

export async function loadProgressSummary() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return { summary: null, error: 'Not signed in' }

  // Fetch last 60 days of completed packs to compute streak.
  const since = new Date()
  since.setDate(since.getDate() - 60)

  const { data: packs, error: packsErr } = await supabase
    .from('daily_packs')
    .select('pack_date, completed_at')
    .eq('user_id', user.id)
    .not('completed_at', 'is', null)
    .gte('pack_date', isoDate(since))
    .order('pack_date', { ascending: false })

  if (packsErr) return { summary: null, error: packsErr.message }

  const completedDates = new Set((packs || []).map((p) => p.pack_date))
  const mostRecent = (packs || [])[0]?.pack_date || null

  // Streak counts consecutive days ending at most recent completed day.
  let streak = 0
  if (mostRecent) {
    let cursor = new Date(mostRecent + 'T00:00:00Z')
    while (completedDates.has(isoDate(cursor))) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }
  }

  // Weekly activity: attempt counts by day (last 7 days).
  const days = rangeDaysBack(7)
  const attemptsSince = dayStartISO(days[0])

  const { data: attempts, error: attErr } = await supabase
    .from('attempts')
    .select(
      `
      created_at,
      is_correct,
      questions (
        lane,
        topic
      )
    `,
    )
    .eq('user_id', user.id)
    .gte('created_at', attemptsSince)
    .order('created_at', { ascending: true })

  if (attErr) return { summary: null, error: attErr.message }

  const activityByDay = days.map((d) => ({ date: isoDate(d), count: 0 }))
  const indexByDate = new Map(activityByDay.map((x, i) => [x.date, i]))

  const laneAgg = new Map()
  const topicAgg = new Map()

  for (const a of attempts || []) {
    const day = isoDate(a.created_at)
    const idx = indexByDate.get(day)
    if (idx !== undefined) activityByDay[idx].count += 1

    const lane = a.questions?.lane
    const topic = a.questions?.topic

    if (lane) {
      const agg = laneAgg.get(lane) || { lane, total: 0, correct: 0 }
      agg.total += 1
      if (a.is_correct) agg.correct += 1
      laneAgg.set(lane, agg)
    }

    if (lane && topic) {
      const key = `${lane}::${topic}`
      const agg = topicAgg.get(key) || { lane, topic, total: 0, correct: 0 }
      agg.total += 1
      if (a.is_correct) agg.correct += 1
      topicAgg.set(key, agg)
    }
  }

  const laneAccuracy = Array.from(laneAgg.values())
    .map((x) => ({ ...x, accuracy: x.total ? x.correct / x.total : 0 }))
    .sort((a, b) => a.lane.localeCompare(b.lane))

  const topicAccuracy = Array.from(topicAgg.values())
    .map((x) => ({ ...x, accuracy: x.total ? x.correct / x.total : 0 }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 10) // show weakest topics

  return {
    summary: {
      streak,
      mostRecentCompletedDate: mostRecent,
      weeklyActivity: activityByDay,
      laneAccuracy,
      topicAccuracy,
    },
    error: null,
  }
}

