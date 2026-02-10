# Mastery

**CS 491 Capstone Project**

**Team:** Md Uddin, Josh Marquez, Mahfuz Zaman, Shadman Uddin, Wilbert Carvajal

---

## What Is Mastery?

Mastery is a Duolingo-style web application designed to help users break into technology roles and remain interview-ready through structured daily practice. Each daily session contains three focused exercises:

- **Code Card** — code snippets, output prediction, syntax recognition
- **System Design / Technical Card** — architecture decisions, tradeoffs, debugging scenarios
- **Behavioral Card** — STAR-based interview preparation

The platform emphasizes consistency, allowing users to complete meaningful practice in 5–8 minutes per day.

---

## Tech Stack (Updated — Supabase)

| Layer | Tech |
|-------|------|
| Frontend | React (Vite), Tailwind CSS, React Router, Supabase JS Client, React Hook Form |
| Backend | Supabase (managed — no custom server) |
| Database | Supabase Postgres |
| Auth | Supabase Auth (email/password, optional OAuth later) |
| Security | Row Level Security (RLS) policies |
| APIs | Supabase auto-generated REST + PostgREST + optional RPC |
| Hosting | Vercel (frontend), Supabase (backend + DB + auth) |

---

## Architecture

```
React Client
     ↓
Supabase JS Client
     ↓
Supabase Auth + Postgres + RLS
```

**Auth Flow:** User logs in → Supabase session is created → session is used for database requests automatically → RLS ensures users only access their own data. No custom Node/Express server needed.

---

## Getting Started

```bash
# 1. Install frontend dependencies
npm run install:all

# 2. Set up environment variables
cp frontend/.env.example frontend/.env
# Then edit frontend/.env with your Supabase URL and anon key

# 3. Set up the database
# Copy the contents of database/schema.sql into the Supabase SQL Editor and run it.
# This creates all tables, RLS policies, and the auto-profile trigger.

# 4. Run the frontend
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## Environment Variables

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase publishable (anon) key |

### Backend (`backend/.env`) — only for admin scripts / seeds

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role (secret) key |

> **Never commit `.env` files.** Use `.env.example` as a template.

---

## Database

All tables live in **Supabase Postgres**. The full schema including RLS policies is in `database/schema.sql`.

**Tables:**
- `profiles` — links to `auth.users`, stores role
- `user_settings` — goal, level, track, language
- `questions` — question bank (all lanes)
- `daily_packs` — one pack per user per day
- `daily_pack_items` — the 3 questions inside each pack
- `attempts` — tracks every answer
- `behavioral_answers` — saved STAR stories
- `reports` — flagged questions (optional)

**Security:** Row Level Security (RLS) is enabled on all user-data tables. Users can only access their own rows (`auth.uid() = user_id`).

---

## Core Features

### Daily Pack
Each user receives 3 curated questions per day (one per lane). Pack remains stable for the day. No repeats within 7 days. Weak topics are prioritized.

### Question Player (Card Engine)
MCQ questions, code snippet rendering, explanation after submit, confidence rating (Easy/OK/Hard), time tracking per question.

### Practice Mode
Modes: Weak Topics, Missed Questions, Random, Mock Session (10 questions — optional premium). Filters by lane, topic, difficulty.

### Behavioral Library (STAR)
Save structured STAR responses. Tag by theme (leadership, conflict, teamwork). Edit and review.

### Progress Dashboard
Streak counter, weekly activity chart, accuracy by lane/topic, weak topic detection, session history.

### Content Admin Panel
Create/edit/disable questions, bulk import JSON packs, review flagged content.

---

## User Flows

- **New User:** Landing → Signup → Onboarding → Home → Today's Pack
- **Daily Usage:** Home → Start Pack → Answer Cards → Explanation → Confidence → Complete → Streak Updates
- **Practice:** Practice → Select Mode → Filters → Answer → Summary
- **Behavioral:** Prompt → STAR Entry → Save → Library → Edit/Export
- **Admin:** Admin → Manage Questions → Import Packs → Disable Flagged Content

---

## UI Theme (Tailwind)

| Token | Value |
|-------|-------|
| Primary | `#4F46E5` |
| Background | `#F8FAFC` |
| Card | `#FFFFFF` |
| Text | `#0F172A` |
| Border | `#E2E8F0` |

**Lane accents:** Code = Indigo, System = Cyan, Behavioral = Violet
