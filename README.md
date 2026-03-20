# Mastery

**CS 491 Capstone Project**

**Team:** Md Uddin, Josh Marquez, Mahfuz Zaman, Shadman Uddin, Wilbert Carvajal

Live app: https://mastery-psi.vercel.app/

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
| Frontend | React (Vite), Tailwind CSS, React Router, Supabase JS Client, React Hook Form | -- Currently in progress
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
# Run in Supabase SQL Editor (in order): schema.sql, then migrations/*.sql, then seed.sql.
# This creates tables, RLS, triggers, pack RPC, and the question bank.

# 4. Run the frontend
npm run dev
```

Frontend runs on `http://localhost:5173`

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

-
