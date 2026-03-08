-- Daily Pack generation: 3 lanes/day, stable pack, avoids repeats in last 7 days, saves pack record.
-- Call as: select * from generate_daily_pack(); or generate_daily_pack(pack_date)
-- Uses auth.uid() so caller only gets their own pack.

create or replace function public.generate_daily_pack(p_pack_date date default current_date)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_level text;
  v_track text;
  v_language text;
  v_pack_id uuid;
  v_question_id uuid;
  v_lane text;
  v_position int;
  v_lanes text[] := array['code', 'system', 'behavioral'];
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Existing pack for this day: return it (stable pack)
  select id into v_pack_id
  from daily_packs
  where user_id = v_user_id and pack_date = p_pack_date
  limit 1;
  if v_pack_id is not null then
    return v_pack_id;
  end if;

  -- User preferences (defaults if no settings row)
  select coalesce(us.level, 'entry'), coalesce(us.track, 'general'), coalesce(us.language, 'javascript')
  into v_level, v_track, v_language
  from user_settings us
  where us.user_id = v_user_id
  limit 1;
  if v_level is null then
    v_level := 'entry';
    v_track := 'general';
    v_language := 'javascript';
  end if;

  -- Create pack
  insert into daily_packs (user_id, pack_date)
  values (v_user_id, p_pack_date)
  returning id into v_pack_id;

  v_position := 0;
  foreach v_lane in array v_lanes
  loop
    v_position := v_position + 1;

    -- Pick one question for this lane:
    -- Filter: lane, level, track, language (code only), is_active
    -- Exclude: attempted in last 7 days (before pack_date + 1 to include pack_date)
    -- Order: weak first (accuracy < 70% or last confidence = 'hard'), then unseen, then by id for stability
    select q.id into v_question_id
    from questions q
    left join lateral (
      select
        count(*) filter (where a.is_correct) as correct_count,
        count(*) as total,
        (array_agg(a.confidence order by a.created_at desc))[1] as last_confidence
      from attempts a
      where a.user_id = v_user_id and a.question_id = q.id
    ) stats on true
    left join lateral (
      select 1 as found
      from attempts a
      where a.user_id = v_user_id
        and a.question_id = q.id
        and a.created_at >= (p_pack_date - interval '7 days')::timestamptz
      limit 1
    ) recent on true
    where q.lane = v_lane
      and q.is_active = true
      and q.level = v_level
      and q.track = v_track
      and (q.language is null or q.lane <> 'code' or q.language = v_language)
      and recent.found is null
    order by
      case
        when coalesce(stats.total, 0) > 0 and (
          (stats.correct_count::float / nullif(stats.total, 0)) < 0.7
          or stats.last_confidence = 'hard'
        ) then 0
        when coalesce(stats.total, 0) = 0 then 1
        else 2
      end,
      q.id
    limit 1;

    -- If no question found (e.g. all attempted recently), pick any eligible by id for stability
    if v_question_id is null then
      select q.id into v_question_id
      from questions q
      where q.lane = v_lane
        and q.is_active = true
        and q.level = v_level
        and q.track = v_track
        and (q.language is null or q.lane <> 'code' or q.language = v_language)
      order by q.id
      limit 1;
    end if;

    -- For code lane only: if still no match (e.g. no senior+frontend+python), relax to level + language, any track
    if v_question_id is null and v_lane = 'code' then
      select q.id into v_question_id
      from questions q
      left join lateral (
        select 1 as found
        from attempts a
        where a.user_id = v_user_id
          and a.question_id = q.id
          and a.created_at >= (p_pack_date - interval '7 days')::timestamptz
        limit 1
      ) recent on true
      where q.lane = 'code'
        and q.is_active = true
        and q.level = v_level
        and (q.language is null or q.language = v_language)
        and recent.found is null
      order by q.id
      limit 1;
    end if;

    -- For code lane only: if still no match, use same level any language (so profile level/track still respected)
    if v_question_id is null and v_lane = 'code' then
      select q.id into v_question_id
      from questions q
      left join lateral (
        select 1 as found
        from attempts a
        where a.user_id = v_user_id
          and a.question_id = q.id
          and a.created_at >= (p_pack_date - interval '7 days')::timestamptz
        limit 1
      ) recent on true
      where q.lane = 'code'
        and q.is_active = true
        and q.level = v_level
        and recent.found is null
      order by q.id
      limit 1;
    end if;

    -- For system/behavioral: if no match (e.g. no senior+backend), relax to same level any track
    if v_question_id is null and v_lane in ('system', 'behavioral') then
      select q.id into v_question_id
      from questions q
      left join lateral (
        select 1 as found
        from attempts a
        where a.user_id = v_user_id
          and a.question_id = q.id
          and a.created_at >= (p_pack_date - interval '7 days')::timestamptz
        limit 1
      ) recent on true
      where q.lane = v_lane
        and q.is_active = true
        and q.level = v_level
        and recent.found is null
      order by q.id
      limit 1;
    end if;

    -- For system/behavioral: if still no match, any level (so pack always has 3 questions when DB has any)
    if v_question_id is null and v_lane in ('system', 'behavioral') then
      select q.id into v_question_id
      from questions q
      left join lateral (
        select 1 as found
        from attempts a
        where a.user_id = v_user_id
          and a.question_id = q.id
          and a.created_at >= (p_pack_date - interval '7 days')::timestamptz
        limit 1
      ) recent on true
      where q.lane = v_lane
        and q.is_active = true
        and recent.found is null
      order by q.id
      limit 1;
    end if;

    if v_question_id is not null then
      insert into daily_pack_items (pack_id, question_id, lane, position)
      values (v_pack_id, v_question_id, v_lane, v_position);
    end if;
  end loop;

  return v_pack_id;
end;
$$;

comment on function public.generate_daily_pack(date) is
  'Generates or returns existing daily pack for the current user: 3 questions (code, system, behavioral), stable per day, excludes questions attempted in last 7 days, prefers weak topics.';
