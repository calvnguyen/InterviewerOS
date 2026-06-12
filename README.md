# InterviewerOS

**A job search workspace.** Log applications, track interviews, sync recruiter emails, and get a clear next action on every open role — all in one place.

---

## What it does

InterviewOS is a Gmail-first job search tracker. Connect your Google account and it immediately pulls job-related emails from your inbox — recruiter outreach, application confirmations, interview invitations, follow-ups — and organises them by company into a searchable pipeline. Log applications manually, track which resume you sent to each role, and always know what to do next.

The focus is Gmail integration and application tracking. Everything else — resume comparison, interview prep, company research, AI recommendations — builds on top of that foundation.

---

## Product roadmap

| Module | Status | What it covers |
|--------|--------|----------------|
| **Application tracking** | Available | Manually log applications, track stage and dates, attach notes |
| **Gmail sync & email intelligence** | Available | Connect Google account, auto-sync recruiter emails (inbox, spam, trash), grouped and parsed by company |
| **Resume tracking** | Planned | Upload resumes, track which resume was sent to which company, compare against job descriptions |
| **Interview prep** | Planned | Notes, question banks, and prep checklists per application |
| **Company research** | Planned | Company snapshots, role context, and relevant news per application |
| **AI recommendations & next actions** | Planned | Suggested next steps, follow-up nudges, and background update detection |
| **Dashboard & analytics** | Planned | Unified view of applications, emails, resumes, and open actions across all roles |

---

## Gmail integration module

The first module to ship. Sign in with Google once — authentication and Gmail read access are granted in a single OAuth flow. No app passwords, no IMAP configuration.

**What it does:**

- Scans your inbox (including Spam and Trash, where recruiters sometimes land) for job-related emails
- Parses each email and groups threads by company, computing the current stage and next action from the content
- Surfaces the emails as pipeline cards with a five-stage Kanban board: Applied, Phone Screen, Interview, Offer, Rejected
- Flags applications that haven't moved in 7+ days
- Lets you re-sync at any time to pull in new emails
- Supports manual application logging and email-paste parsing as fallback intake paths

**What it does not do (yet):**

- Resume upload or tracking
- Resume vs. job description comparison
- Background automated syncing (sync is on-demand)
- Sending emails or taking any write action on Gmail

---

## Tech stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React + Vite                        |
| Backend  | Express (Node.js)                   |
| Database | Supabase (Postgres)                 |
| Auth     | Supabase Auth — Google OAuth2       |
| Testing  | Playwright                          |

---

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- A free [Supabase](https://supabase.com) project
- A Google Cloud project with Gmail API enabled and an OAuth 2.0 Client ID

---

## Setup

### 1. Supabase project

Create a project at [supabase.com](https://supabase.com). From your project's settings collect:

| Setting | Where to find it | `.env` key |
|---------|-----------------|------------|
| Project URL | Settings → API → Project URL | `SUPABASE_URL` |
| Publishable key | Settings → API Keys | `SUPABASE_PUBLISHABLE_KEY` |
| Secret key | Settings → API Keys → Reveal | `SUPABASE_SECRET_KEY` |
| Database URI | Settings → Database → Connection string → URI (Session mode, port 5432) | `DATABASE_URL` |

### 2. Google OAuth credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application).
2. Enable the **Gmail API** under APIs & Services → Library.
3. Add the scope `https://www.googleapis.com/auth/gmail.readonly` under OAuth consent screen.
4. Note your **Client ID** and **Client Secret**.

### 3. Configure Supabase Google provider

In your Supabase dashboard → Authentication → Providers → Google:
- Enable the provider
- Paste in your Google Client ID and Client Secret
- Copy the **Supabase redirect URL** shown (`https://<ref>.supabase.co/auth/v1/callback`) and add it to your Google OAuth client's Authorized redirect URIs.

### 4. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```
SUPABASE_URL=https://your-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=eyJ...
DATABASE_URL=postgresql://postgres...

GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

### 5. Install dependencies and seed the database

```bash
# Backend
cd server
npm install
node seed.js      # creates tables and inserts demo data
cd ..

# Frontend
cd client
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
cd ..
```

`seed.js` creates a throwaway email/password account (`demo@interviewos.app`) for local dev testing and prints its credentials. This is separate from the Google OAuth flow used in normal sign-in.

---

## Running the app

```bash
# Terminal 1 — backend (http://localhost:3001)
cd server && node index.js

# Terminal 2 — frontend (http://localhost:5173)
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Click **Sign in with Google** to authenticate and trigger the first Gmail sync.

To stop both servers:

```bash
pkill -f "node index.js" && pkill -f "vite"
```

---

## How Gmail sync works

InterviewOS never stores your Google access token. When you sign in with Google, Supabase issues you a session that includes a short-lived `provider_token` — a read-only Gmail access token. When you trigger a sync, the frontend passes that token to the backend, the backend calls the Gmail API to fetch recent job-related emails, parses them, writes the results to Supabase, and discards the token. Your Gmail credentials never leave the current session.

The sync searches the inbox, Spam, and Trash folders. Recruiter emails frequently land in Spam or get deleted before you see them — searching those folders catches messages you may have missed. The Gmail query matches patterns like "thank you for applying", "interview invitation", "we'd like to schedule", and "unfortunately we've decided to move forward with other candidates".

Matched emails are grouped by company. Each thread is parsed into a pipeline card showing the current stage, the most recent communication, and a computed next action. Re-syncing is safe — already-imported emails are deduped by Gmail message ID, so you never get duplicate cards.

---

## API overview

The backend exposes a JSON REST API at `http://localhost:3001/api`. All endpoints except the Gmail sync require a Supabase Bearer token in the `Authorization` header.

| Method | Path | What it does |
|--------|------|--------------|
| `POST` | `/api/gmail/sync` | Scan Gmail and import new applications |
| `GET` | `/api/gmail/last-synced` | Return the last sync timestamp |
| `GET` | `/api/applications` | List all applications for the signed-in user |
| `POST` | `/api/applications` | Create an application manually |
| `PUT` | `/api/applications/:id` | Update stage, notes, or other fields |
| `DELETE` | `/api/applications/:id` | Delete an application |
| `POST` | `/api/applications/parse-email` | Parse pasted email text, return pre-filled fields |

---

## Project structure

```
interviewos/
├── server/                 ← Express API
│   ├── index.js            entry point (port 3001)
│   ├── middleware/
│   │   └── auth.js         JWT verification against Supabase JWKS
│   ├── routes/
│   │   ├── gmail.js        sync and last-synced endpoints
│   │   └── applications.js CRUD + parse-email
│   ├── lib/
│   │   ├── parseEmail.js   regex-based email parser
│   │   └── computeFields.js next_action and stale derivation
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.js             create tables + demo data
│
├── client/                 ← React + Vite app
│   ├── src/
│   │   ├── lib/
│   │   │   ├── supabase.js Supabase browser client
│   │   │   └── api.js      fetch helpers with auth header
│   │   ├── context/
│   │   │   └── SessionContext.jsx
│   │   ├── auth/
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   └── Pipeline.jsx
│   │   └── components/
│   │       ├── ApplicationModal.jsx
│   │       └── ErrorBoundary.jsx
│   └── index.html
│
└── docs/                   ← generated spec files
    ├── scope.md
    ├── prd.md
    ├── decisions.md
    ├── user-stories.md
    └── api-contract.md
```

---

## Troubleshooting

**Sign in with Google does nothing.** The Supabase Google provider is not configured. Go to your Supabase dashboard → Authentication → Providers → Google and enable it with your Client ID and Client Secret.

**Gmail sync returns 503.** The Google access token in the session has expired. Sign out and sign back in to get a fresh token, then sync again.

**Pipeline shows "Could not load your pipeline."** The backend is not running or `server/.env` is missing. Start `node index.js` in `server/` and confirm all five env vars are present.

**`node seed.js` fails with "relation does not exist".** The `DATABASE_URL` is incorrect. Use the Session mode URI (port 5432) from Supabase → Settings → Database → Connection string.

**401 on all API calls.** The Supabase session token isn't being sent or has expired. Check that `client/.env` has the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Sign out and back in.

---

## License

MIT
