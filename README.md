# InterviewerOS

**A job search workspace.** Log applications, track interviews, sync recruiter emails, and get a clear next action on every open role — all in one place.

**Live:** https://intervieweros.vercel.app

---

## What it does

InterviewerOS is a Gmail-first job search tracker. Connect your Google account and it immediately pulls job-related emails from your inbox — recruiter outreach, application confirmations, interview invitations, follow-ups — and organises them by company into a Kanban pipeline.

- **Fuzzy global search** across company names, roles, notes, and email content — with a live results dropdown and `Cmd+K` command palette
- **Drag-and-drop Kanban board** across five stages: Applied → Phone Screen → Interview → Offer → Rejected
- **Application drawer** — click any card to see details, activity timeline, email preview, notes, resume used, and interview prep
- **Metrics strip** — total, active, interviews, offers, and response rate computed live from your pipeline
- **Resume tracking** — name and link resumes, tag which resume went to which application
- **Interview prep** — notes textarea and checklist per application (available at Interview and Offer stages)
- **Activity log** — timestamped history of stage changes, notes edits, and Gmail imports per application
- **Notification center** — bell icon in the header surfaces sync results and stale-application alerts
- **Smart email parser** — 5-stage pipeline with per-field confidence scoring extracts company, role, and stage from pasted email text or Gmail imports

---

## Product roadmap

| Module | Status | What it covers |
|--------|--------|----------------|
| **Application tracking** | ✅ Available | Manually log applications, track stage and dates, attach notes |
| **Gmail sync & email intelligence** | ✅ Available | Connect Google account, auto-sync recruiter emails, grouped and parsed by company |
| **Drag-and-drop pipeline** | ✅ Available | Move cards between stages by dragging or the Move-to menu |
| **Application drawer** | ✅ Available | Detail panel with activity log, email preview, notes, resume, interview prep |
| **Resume tracking** | ✅ Available | Name resumes, link them to applications |
| **Interview prep** | ✅ Available | Notes and checklist per application at Interview/Offer stage |
| **Global search & command palette** | ✅ Available | Fuse.js fuzzy search, live dropdown, Cmd+K palette with quick actions |
| **Notification center** | ✅ Available | Bell icon with unread badge, sync and stale-app alerts |
| **Company research** | Planned | Company snapshots, role context, and relevant news per application |
| **AI recommendations & next actions** | Planned | Suggested follow-ups, nudges, and background update detection |
| **Dashboard & analytics** | Planned | Unified view of applications, emails, resumes, and open actions |

---

## Gmail integration

Sign in with Google once — authentication and Gmail read access are granted in a single OAuth flow. No app passwords, no IMAP configuration.

- Scans inbox, Spam, and Trash for job-related emails
- Parses each email and groups threads by company, computing stage and next action
- Deduplicates by Gmail message ID — re-syncing is safe
- Stores `email_subject` and `email_snippet` per application for preview in the drawer
- Supports manual application logging and email-paste parsing as fallback intake paths

InterviewerOS never stores your Google access token. The frontend passes the short-lived `provider_token` to the backend for each sync request; it is discarded immediately after use.

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` / `Ctrl+K` | Open command palette |
| `↑ ↓` | Navigate search dropdown or command palette |
| `Enter` | Open selected result |
| `Escape` | Close dropdown / palette |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| UI | shadcn/ui (Radix UI + Tailwind CSS) |
| Search | Fuse.js (in-memory fuzzy search) |
| Drag-and-drop | @dnd-kit/core |
| Backend | Express (Node.js) |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth — Google OAuth2 |
| Testing | Playwright |
| Frontend hosting | Vercel |
| Backend hosting | Railway |

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

`seed.js` creates a throwaway email/password account (`demo@intervieweros.app`) for local dev testing and prints its credentials. This is separate from the Google OAuth flow used in normal sign-in.

---

## Running the app

```bash
# Terminal 1 — backend (http://localhost:3001)
cd server && node index.js

# Terminal 2 — frontend (http://localhost:5173)
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Click **Sign in with Google** to authenticate and trigger the first Gmail sync.

---

## UI components

The frontend uses [shadcn/ui](https://ui.shadcn.com) — components built on [Radix UI](https://www.radix-ui.com) primitives styled with [Tailwind CSS](https://tailwindcss.com). Components live in `client/src/components/ui/` and are part of the source tree.

**Components currently installed:** `button`, `input`, `label`, `textarea`, `select`, `dialog`, `badge`, `card`, `alert`.

To add a new component:

```bash
cd client && npx shadcn@latest add <component-name>
```

---

## Testing

End-to-end tests use [Playwright](https://playwright.dev) and live in `tests/`.

```bash
npm test           # headless
npm run test:ui    # interactive UI mode
npm run test:report  # view last HTML report
```

Tests require `client/.env` to be populated (Supabase URL + publishable key). Copy `client/.env.example` → `client/.env` and fill in the values before running.

---

## API overview

All endpoints require a Supabase Bearer token in the `Authorization` header except where noted.

| Method | Path | What it does |
|--------|------|--------------|
| `POST` | `/api/gmail/sync` | Scan Gmail and import new applications |
| `GET` | `/api/gmail/last-synced` | Return the last sync timestamp |
| `GET` | `/api/applications` | List all applications for the signed-in user |
| `POST` | `/api/applications` | Create an application manually |
| `PUT` | `/api/applications/:id` | Update stage, notes, or other fields |
| `DELETE` | `/api/applications/:id` | Delete an application |
| `POST` | `/api/applications/parse-email` | Parse pasted email text, return pre-filled fields with confidence scores |
| `GET` | `/api/applications/:id/activity` | Return activity log for an application |
| `GET` | `/api/applications/:id/prep` | Get interview prep notes and checklist |
| `PUT` | `/api/applications/:id/prep` | Upsert interview prep |
| `GET` | `/api/resumes` | List user's saved resumes |
| `POST` | `/api/resumes` | Create a resume record |
| `DELETE` | `/api/resumes/:id` | Delete a resume |

---

## Project structure

```
intervieweros/
├── server/                     ← Express API (port 3001)
│   ├── index.js                entry point + CORS config
│   ├── middleware/
│   │   └── auth.js             JWT verification against Supabase JWKS
│   ├── routes/
│   │   ├── gmail.js            sync + last-synced endpoints
│   │   ├── applications.js     CRUD + parse-email + activity log
│   │   ├── resumes.js          resume CRUD
│   │   └── prep.js             interview prep upsert/get
│   ├── lib/
│   │   ├── parseEmail.js       5-stage regex parser with per-field confidence scoring
│   │   └── computeFields.js    next_action and stale derivation (computed at read time)
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_email_preview_activity.sql   email_subject, email_snippet, activity_log table
│   │   └── 003_resume_interview_prep.sql    resumes, interview_prep tables
│   └── seed.js                 create tables + demo data
│
├── client/                     ← React + Vite app
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── useFuseSearch.js   Fuse.js fuzzy search hook
│   │   │   └── useNotifications.js  local notification state
│   │   ├── lib/
│   │   │   ├── supabase.js     Supabase browser client
│   │   │   └── api.js          fetch helpers with auth header
│   │   ├── context/
│   │   │   └── SessionContext.jsx
│   │   ├── auth/
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   └── Pipeline.jsx    Kanban board + all state management
│   │   └── components/
│   │       ├── AppSidebar.jsx          left navigation sidebar
│   │       ├── ApplicationDrawer.jsx   right detail panel
│   │       ├── ApplicationModal.jsx    add/edit modal
│   │       ├── CommandPalette.jsx      Cmd+K palette
│   │       ├── CompanyAvatar.jsx       initials + logo.dev avatar
│   │       ├── MetricsStrip.jsx        pipeline summary stats
│   │       ├── NotificationCenter.jsx  bell + notification dropdown
│   │       ├── SearchDropdown.jsx      live fuzzy search results
│   │       ├── Logo.jsx
│   │       └── ErrorBoundary.jsx
│   └── index.html
│
├── tests/                      ← Playwright E2E tests
│   └── smoke.spec.js
├── playwright.config.js
│
└── docs/
    ├── scope.md
    ├── prd.md
    ├── decisions.md
    ├── user-stories.md
    └── api-contract.md
```

---

## Troubleshooting

**Sign in with Google does nothing.** The Supabase Google provider is not configured. Go to Supabase dashboard → Authentication → Providers → Google and enable it.

**Gmail sync returns 503.** The Google access token has expired. Sign out and back in to get a fresh token.

**Pipeline shows "Could not load your pipeline."** The backend is not running or `server/.env` is missing.

**`node seed.js` fails with "relation does not exist".** The `DATABASE_URL` is incorrect. Use the Session mode URI (port 5432) from Supabase → Settings → Database.

**401 on all API calls.** Check that `client/.env` has the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Sign out and back in.

---

## License

MIT
