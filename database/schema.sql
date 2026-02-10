-- ============================================================
-- Mastery — Supabase Postgres Schema
-- ============================================================
-- Supabase already provides auth.users via Supabase Auth.
-- This schema creates the app-level tables that reference auth.users.
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- profiles (links to auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

-- ============================================================
-- user_settings
-- ============================================================
create table user_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  goal text default 'interview_prep' check (goal in ('break_into_tech', 'interview_prep', 'stay_sharp')),
  level text default 'entry' check (level in ('entry', 'mid', 'senior')),
  track text default 'general' check (track in ('general', 'frontend', 'backend')),
  language text default 'javascript' check (language in ('python', 'javascript', 'java')),
  updated_at timestamptz default now()
);

-- ============================================================
-- questions
-- ============================================================
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

-- ============================================================
-- daily_packs (one per user per day)
-- ============================================================
create table daily_packs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  pack_date date not null,
  created_at timestamptz default now(),
  completed_at timestamptz default null,
  unique(user_id, pack_date)
);

-- ============================================================
-- daily_pack_items (the 3 questions inside each daily pack)
-- ============================================================
create table daily_pack_items (
  id uuid primary key default uuid_generate_v4(),
  pack_id uuid not null references daily_packs(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  lane text not null check (lane in ('code', 'system', 'behavioral')),
  position int not null
);

-- ============================================================
-- attempts (tracks each answer a user gives)
-- ============================================================
create table attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  pack_id uuid default null references daily_packs(id) on delete set null,
  is_correct boolean not null,
  confidence text default null check (confidence is null or confidence in ('easy', 'ok', 'hard')),
  time_spent_sec int default null,
  created_at timestamptz default now()
);

-- ============================================================
-- behavioral_answers (saved STAR interview stories)
-- ============================================================
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

-- ============================================================
-- reports (flagged questions — optional)
-- ============================================================
create table reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  reason text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- profiles: users can read/update their own row
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- user_settings: users can CRUD their own settings
alter table user_settings enable row level security;
create policy "Users can view own settings" on user_settings for select using (auth.uid() = user_id);
create policy "Users can insert own settings" on user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own settings" on user_settings for update using (auth.uid() = user_id);

-- questions: public read, admin write (admin policies can be added later)
alter table questions enable row level security;
create policy "Anyone can read active questions" on questions for select using (is_active = true);

-- daily_packs: users can only access their own packs
alter table daily_packs enable row level security;
create policy "Users can view own packs" on daily_packs for select using (auth.uid() = user_id);
create policy "Users can insert own packs" on daily_packs for insert with check (auth.uid() = user_id);
create policy "Users can update own packs" on daily_packs for update using (auth.uid() = user_id);

-- daily_pack_items: users access through their packs
alter table daily_pack_items enable row level security;
create policy "Users can view own pack items" on daily_pack_items for select
  using (pack_id in (select id from daily_packs where user_id = auth.uid()));
create policy "Users can insert own pack items" on daily_pack_items for insert
  with check (pack_id in (select id from daily_packs where user_id = auth.uid()));

-- attempts: users can only access their own attempts
alter table attempts enable row level security;
create policy "Users can view own attempts" on attempts for select using (auth.uid() = user_id);
create policy "Users can insert own attempts" on attempts for insert with check (auth.uid() = user_id);

-- behavioral_answers: users can only access their own
alter table behavioral_answers enable row level security;
create policy "Users can view own behavioral answers" on behavioral_answers for select using (auth.uid() = user_id);
create policy "Users can insert own behavioral answers" on behavioral_answers for insert with check (auth.uid() = user_id);
create policy "Users can update own behavioral answers" on behavioral_answers for update using (auth.uid() = user_id);

-- reports: users can only access their own
alter table reports enable row level security;
create policy "Users can view own reports" on reports for select using (auth.uid() = user_id);
create policy "Users can insert own reports" on reports for insert with check (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile on signup (trigger)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
