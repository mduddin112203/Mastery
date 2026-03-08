-- Optional maintenance scripts. Run in Supabase SQL editor when needed.

-- Remove duplicate questions (same lane, level, track, language, prompt).
-- Keeps one row per group; only deletes rows not referenced in daily_pack_items or attempts.
WITH dupes AS (
  SELECT
    lane, level, track, language, prompt,
    (array_agg(id ORDER BY id))[1] AS keep_id
  FROM questions
  GROUP BY lane, level, track, language, prompt
  HAVING count(*) > 1
),
ids_to_remove AS (
  SELECT q.id
  FROM questions q
  JOIN dupes d
    ON q.lane = d.lane AND q.level = d.level AND q.track = d.track
   AND (q.language IS NOT DISTINCT FROM d.language) AND q.prompt = d.prompt
  WHERE q.id <> d.keep_id
    AND NOT EXISTS (SELECT 1 FROM daily_pack_items dpi WHERE dpi.question_id = q.id)
    AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.question_id = q.id)
)
DELETE FROM questions
WHERE id IN (SELECT id FROM ids_to_remove);
