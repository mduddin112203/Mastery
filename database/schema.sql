-- Mastery database schema

-- we need this for generating UUIDs
create extension if not exists "uuid-ossp";

-- profiles table — every user gets one, linked to supabase auth
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

-- user settings — onboarding preferences, one row per user
create table user_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  goal text default 'interview_prep' check (goal in ('break_into_tech', 'interview_prep', 'stay_sharp')),
  level text default 'entry' check (level in ('entry', 'mid', 'senior')),
  track text default 'general' check (track in ('general', 'frontend', 'backend')),
  language text default 'javascript' check (language in ('python', 'javascript', 'java')),
  updated_at timestamptz default now()
);

-- questions — the full question bank across all three lanes
create table questions (
  id uuid primary key default uuid_generate_v4(),
  lane text not null check (lane in ('code', 'system', 'behavioral')),
  level text default 'entry' check (level in ('entry', 'mid', 'senior')),
  track text default 'general' check (track in ('general', 'frontend', 'backend')),
  language text default null check (language is null or language in ('python', 'javascript', 'java')),
  topic text not null,
  prompt text not null,
  snippet text default null,
  choices jsonb not null,
  answer_index int not null,
  explanation text not null,
  difficulty int default 2 check (difficulty between 1 and 3),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- daily packs — each user gets one pack per day with 3 questions
create table daily_packs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  pack_date date not null,
  created_at timestamptz default now(),
  completed_at timestamptz default null,
  unique(user_id, pack_date)
);

-- daily pack items — the 3 questions inside a pack
create table daily_pack_items (
  id uuid primary key default uuid_generate_v4(),
  pack_id uuid not null references daily_packs(id) on delete cascade,
  question_id uuid not null references questions(id) on delete restrict,
  lane text not null check (lane in ('code', 'system', 'behavioral')),
  position int not null,
  unique (pack_id, position),
  unique (pack_id, question_id)
);

-- attempts — logs every answer a user submits
-- don't delete past questions with attempts - use questions.is_active = false
create table attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  question_id uuid not null references questions(id) on delete restrict,
  pack_id uuid default null references daily_packs(id) on delete set null,
  selected_index int not null check (selected_index >= 0),
  is_correct boolean not null,
  confidence text default null check (confidence is null or confidence in ('easy', 'ok', 'hard')),
  time_spent_sec int default null,
  created_at timestamptz default now()
);

-- behavioral answers — saved STAR responses for interview prep
create table behavioral_answers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  situation text not null,
  task text not null,
  action text not null,
  result text not null,
  reflection text default null,
  tags jsonb default null,
  updated_at timestamptz default now()
);

-- reports — lets users flag bad/wrong questions
create table reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  reason text not null,
  created_at timestamptz default now()
);


-- RLS (row level security) — users can only touch their own data
alter table profiles enable row level security;
create policy "users read own profile" on profiles for select using (auth.uid() = id);
create policy "users update own profile" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

alter table user_settings enable row level security;
create policy "users read own settings" on user_settings for select using (auth.uid() = user_id);
create policy "users insert own settings" on user_settings for insert with check (auth.uid() = user_id);
create policy "users update own settings" on user_settings
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- questions are public read — anyone logged in can see active ones
alter table questions enable row level security;
create policy "read active questions" on questions for select using (is_active = true);

-- admin policies
create policy "admins read all questions" on questions
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "admins insert questions" on questions
  for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "admins update questions" on questions
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "admins delete questions" on questions
  for delete using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

alter table daily_packs enable row level security;
create policy "users read own packs" on daily_packs for select using (auth.uid() = user_id);
create policy "users insert own packs" on daily_packs for insert with check (auth.uid() = user_id);

create policy "users update own packs" on daily_packs
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table daily_pack_items enable row level security;
create policy "users read own pack items" on daily_pack_items for select
  using (pack_id in (select id from daily_packs where user_id = auth.uid()));
create policy "users insert own pack items" on daily_pack_items for insert
  with check (pack_id in (select id from daily_packs where user_id = auth.uid()));

alter table attempts enable row level security;
create policy "users read own attempts" on attempts for select using (auth.uid() = user_id);
create policy "users insert own attempts" on attempts for insert with check (auth.uid() = user_id);

alter table behavioral_answers enable row level security;
create policy "users read own behavioral answers" on behavioral_answers for select using (auth.uid() = user_id);
create policy "users insert own behavioral answers" on behavioral_answers for insert with check (auth.uid() = user_id);

create policy "users update own behavioral answers" on behavioral_answers
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table reports enable row level security;
create policy "users read own reports" on reports for select using (auth.uid() = user_id);
create policy "users insert own reports" on reports for insert with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
  before update on public.user_settings
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_behavioral_answers_updated_at on public.behavioral_answers;
create trigger set_behavioral_answers_updated_at
  before update on public.behavioral_answers
  for each row execute procedure public.set_updated_at();

create index if not exists idx_attempts_user_created_at on public.attempts (user_id, created_at desc);
create index if not exists idx_attempts_user_question_created_at on public.attempts (user_id, question_id, created_at desc);
create index if not exists idx_daily_packs_user_pack_date on public.daily_packs (user_id, pack_date);
create index if not exists idx_daily_pack_items_pack_position on public.daily_pack_items (pack_id, position);
create index if not exists idx_questions_active_filters on public.questions (is_active, lane, level, track, language);


-- when someone signs up through supabase auth, auto-create their profile row
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Supabase Security Advisor: ensure auth-related trigger functions have a fixed search_path.
-- (sync_profile_email_from_auth may be present depending on which migrations were applied.)
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'sync_profile_email_from_auth'
      and p.pronargs = 0
  ) then
    execute 'alter function public.sync_profile_email_from_auth() set search_path = public';
  end if;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();