# Mastery

**CS 491 Capstone Project**

**Team:** Md Uddin, Josh Marquez, Mahfuz Zaman, Shadman Uddin, Wilbert Carvajal

---

## What Is Mastery?

A Duolingo-style web app for daily tech interview practice. Each day you get 3 cards — a Code card, a System Design card, and a Behavioral card. Takes about 5–8 minutes a day.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React, Vite, Tailwind CSS, React Router, Axios, React Hook Form |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Auth | JWT, bcrypt |
| Hosting | AWS EC2, Route 53 |

---

## Getting Started

```bash
# 1. Install everything
npm run install:all

# 2. Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Then edit the .env files with your DB credentials, JWT secret, etc.

# 3. Create the database
mysql -u root -p < database/schema.sql

# 4. Run the app
npm run dev
```

Frontend runs on `http://localhost:5173`
Backend runs on `http://localhost:5001`
