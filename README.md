# FocusTrack — Pomodoro / Task Track Timer

Express + TypeScript API, Vite React client, Supabase Auth/DB, OpenAI task planner.

## Quick start

1. **Install**

```bash
npm install
```

2. **Supabase**

- Create a project at [supabase.com](https://supabase.com)
- Run your SQL schema in the Supabase SQL Editor (tables: profiles, tasks, timer_sessions, ai_plans, suggestions + RLS)
- Enable Email (+ optional Google) auth; set Site URL / redirect URLs for local and Vercel

3. **Env files**

Create local env files (they are gitignored — do not commit):

- `server/.env` — `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `OPENAI_API_KEY`, `PORT`, `CLIENT_ORIGIN`
- `client/.env` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_URL=http://localhost:3001`

On Vercel, set the same names under **Project → Settings → Environment Variables** (leave `VITE_API_URL` empty for production).

4. **Run**

```bash
npm run dev
```

- App: http://localhost:5173  
- API: http://localhost:3001/api/health  

## Course notes

Local course notes live under `docs/` (gitignored). For Vercel deploy steps, see Project Settings → Environment Variables and `vercel.json` at the repo root.

## Features

- Email/password + Google login
- Header: Tracker, Summary, Suggestions, Pomodoro / Task Track mode
- Tracker: task filters, timer, AI prompt planner
- Summary: daily / weekly / monthly stats
- Suggestions form with validation

## Deploy on Vercel

This repo includes `vercel.json` + serverless Express at `api/index.ts`.

Set env vars in the Vercel dashboard (not in git). Leave `VITE_API_URL` empty so the client calls same-origin `/api`.
