# Reference brief — CareerSync

**Company URL:** https://github.com/Tomiwajin/CareerSync
**Repo URL:** https://github.com/Tomiwajin/CareerSync
**Language(s):** TypeScript (98.2%), CSS (1.6%), JavaScript (0.2%)

---

## What it does

CareerSync is an open-source job application tracker that connects to a user's Gmail account via OAuth2 and automatically parses incoming emails to identify job applications, extract company names, job titles, and status signals (applied, interview invite, rejection, offer). The app is intentionally stateless — it reads directly from Gmail on demand, does no server-side storage, and processes everything client-side. The target user is a job seeker who wants a real-time picture of their application pipeline without manually entering data.

## Core user flow

1. User authenticates with Google via OAuth2 (read-only Gmail access).
2. CareerSync scans the inbox with regex patterns to find job-related emails.
3. Extracted applications appear in a dashboard showing company, role, status, and date.
4. User filters and searches the list by company, role, status, or date range.
5. User views analytics (success rates, status breakdown, conversion rates).
6. User exports the full list to Excel, CSV, or Google Sheets.

## How it works (high level)

- Next.js API routes proxy Gmail API calls using the googleapis client; the OAuth token lives in an HTTP-only cookie.
- Regex pattern matching classifies emails into statuses: Applied, Interview, Rejected, Offer.
- State is managed client-side with Zustand — there is no database; every page load re-fetches from Gmail.
- ExcelJS generates export files on the server when the user clicks export.

## Feature inventory

| Feature | What it does |
|---------|--------------|
| Gmail OAuth2 login | Authenticates user with read-only Gmail access; no password stored |
| Auto email parsing | Scans inbox with regex to find job application emails |
| Company/role extraction | Pulls company name and job title from email body and sender |
| Status classification | Labels each application: Applied, Interview, Rejected, Offer, etc. |
| Application list view | Table of all detected applications with company, role, status, date |
| Multi-criteria search | Filter by company, role, email address, or status; date range filter |
| Analytics dashboard | Charts for status distribution, success rates, conversion rates, timeline |
| Excel/CSV export | Generates downloadable spreadsheet of all applications |
| Google Sheets export | Generates a Sheets-compatible CSV |
| Duplicate prevention | Avoids double-counting emails from the same application thread |
| Stateless architecture | Zero server storage; everything read live from Gmail |
| Read-only Gmail scope | Requests minimal permissions; does not send or modify emails |
| FAQ page | Explains how the parser works, what data is read, privacy policy |
| Privacy/Terms pages | Legal boilerplate for OAuth app review |

## Data model (if repo provided)

CareerSync has no persistent data model — it is stateless. The effective in-memory shape per application is:

- `id` — derived from Gmail message ID
- `company` — extracted from email body/sender
- `role` — extracted from subject/body
- `status` — classified: Applied | Interview | Rejected | Offer | Unknown
- `date` — email received date
- `emailAddress` — sender
- `subject` — original email subject
- `snippet` — first ~200 chars of body

## Key files and folders (if repo provided)

| Path | What it does |
|------|--------------|
| `app/page.tsx` | Landing page / entry point |
| `app/api/` | Next.js API routes — Gmail OAuth callback and email fetch endpoints |
| `app/analytics/` | Analytics dashboard page |
| `app/export/` | Export functionality page |
| `app/account/` | User account / auth state page |
| `components/` | Shared UI components (shadcn/ui wrappers, dashboard widgets) |
| `lib/` | Gmail API client, regex parsing logic, status classifier |
| `hooks/` | React hooks for fetching and state |
| `.env.example` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |

## Who it's for

A developer or technically comfortable job seeker sets it up by registering a Google Cloud project and adding OAuth credentials. The end user is an active job seeker who wants to see all their applications in one place without manual data entry, using Gmail as the source of truth.

## Things worth flagging

1. **No persistence is a core design choice** — every session re-fetches from Gmail. Sprint Zero's MVP will invert this: applications are stored in Supabase, making the pipeline stateful and editable.
2. **Gmail OAuth is the only intake mechanism** — the reference has no manual entry at all. The scope.md correctly cuts live Gmail in favor of paste-in email content, which removes the OAuth dependency and Google Cloud project requirement entirely.
3. **No Kanban/pipeline UI** — the reference shows a flat table with status labels, not a drag-and-drop pipeline board. The Sprint Zero core loop adds a pipeline view with explicit stage progression and next-action surfacing, which is a meaningful UX upgrade.
4. **AI is implied but thin** — the README mentions "intelligent" parsing but the implementation is regex-based. No LLM calls. Sprint Zero MVP should stay in this lane: deterministic parsing of pasted email text, no AI calls needed.
5. **TypeScript + Next.js stack** — the reference uses a different stack than Sprint Zero's Express + React + Vite. The schema and feature logic are what matter for the brief, not the framework choices.
