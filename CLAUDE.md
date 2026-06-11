# CLAUDE.md — InterviewOS

InterviewOS is an AI-powered job search workspace. Users sign in with Google, which grants Gmail read access in a single OAuth flow. The app scans their inbox for job-related emails and populates a Kanban pipeline. Users can also add applications manually or via email paste.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite (`client/`) |
| Backend | Express on port 3001 (`server/`) |
| Database + Auth | Supabase (Postgres + Google OAuth via Supabase Auth) |

## Key files

- `docs/` — spec files: scope, PRD, decisions, user stories, API contract
- `server/index.js` — Express entry point
- `server/routes/gmail.js` — Gmail sync (`POST /api/gmail/sync`, `GET /api/gmail/last-synced`)
- `server/routes/applications.js` — CRUD + email parse
- `server/lib/parseEmail.js` — regex email parser (no LLM calls)
- `server/lib/computeFields.js` — derives `next_action` and `stale` at read time, never stored
- `server/migrations/001_initial_schema.sql` — `applications` and `user_meta` tables
- `server/seed.js` — creates tables and inserts demo data
- `client/src/lib/api.js` — all fetch calls to the backend
- `client/src/context/SessionContext.jsx` — Supabase session, `signInWithGoogle()`
- `client/src/pages/Login.jsx` — Google Sign-In button
- `client/src/pages/Pipeline.jsx` — Kanban board, Gmail sync, application cards

## Auth pattern

Google Sign-In is handled entirely client-side via `supabase.auth.signInWithOAuth({ provider: 'google' })`. The backend never runs OAuth redirect routes. After sign-in, `session.provider_token` is the Google access token — the frontend passes it to `POST /api/gmail/sync` as `{ google_token }`. The backend uses it for that request only and never stores it.

## API contract

`docs/api-contract.md` is the single source of truth. All backend routes must match it exactly. Never change a response shape without updating the contract first.

## Rules

- Plain JavaScript — no TypeScript
- No LLM calls — email parsing is regex only (`server/lib/parseEmail.js`)
- `next_action` and `stale` are computed at read time, never stored in the database
- Hard delete only (no soft delete / archive)
- Stage values: `applied`, `phone_screen`, `interview`, `offer`, `rejected`

## Running locally

```bash
# Backend
cd server && npm install && node seed.js && node index.js

# Frontend (new terminal)
cd client && npm install && npm run dev
```

Copy `.env.example` → `.env` and fill in all values before running. See README.md for full setup instructions.
