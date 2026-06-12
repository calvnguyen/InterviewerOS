# Decisions

_Sprint Zero build compared to CareerSync (Tomiwajin). Level: Prod._

## Why this document exists

We studied CareerSync, an open-source Gmail-connected job tracker, and built a production-ready version at Prod scope. The reference is stateless — it reads live from Gmail, stores nothing, and focuses on automatic email discovery. Our build adds Supabase persistence, a Kanban pipeline with stage management, next-action labels, and error boundaries. Gmail OAuth is kept as the primary intake path. Every cut below reflects either the Prod scope or an explicit exclusion from the scoping conversation.

## Scope decisions

### Stateless architecture replaced with Supabase persistence

- **Reference does:** Processes everything client-side with no server storage; every session re-fetches from Gmail.
- **We chose to:** Store every application in Supabase (Postgres) so the pipeline is persistent, editable, and available across sessions.
- **Reason:** The core loop requires a user to return to their pipeline and see prior data. A stateless design makes that impossible. Persistence is not gold-plating — it's the minimum that makes the product worth returning to.

### Flat table replaced with Kanban pipeline

- **Reference does:** Displays applications in a filterable table with status labels.
- **We chose to:** Display applications in a Kanban-style board grouped by stage, with move actions to progress applications.
- **Reason:** The core loop explicitly requires "an interview pipeline with a clear next action" and the ability to "move applications through pipeline stages." A flat table is not the right model for tracking progression.

### Next-action labels added (not in reference)

- **Reference does:** Shows a status label (Applied, Interview, Rejected, etc.) but does not surface a "what to do next" directive.
- **We chose to:** Compute a next-action label per card based on current stage and days since last update.
- **Reason:** Core loop requirement: "sees it placed in an interview pipeline with a clear next action." Rule-based logic (no LLM calls) is sufficient — the stage plus recency is enough to derive a meaningful directive.

### Analytics dashboard cut

- **Reference does:** Provides charts for success rates, status distribution, conversion rates, and timeline analytics.
- **We chose to:** Show only a count per stage on the pipeline board. No analytics page.
- **Reason:** The scope explicitly excluded "bloated analytics dashboards." Analytics are a good v2 candidate once the pipeline loop is solid.

### Export functionality cut

- **Reference does:** Generates Excel, CSV, and Google Sheets exports.
- **We chose to:** Not implement export at this scope.
- **Reason:** Export is not part of the core loop and was not in the scoping session. Listed in "What we'd add next."

### Advanced search and filtering cut

- **Reference does:** Multi-criteria search by company, role, email, and status, plus date range filtering.
- **We chose to:** Not implement search or filtering at this scope; the pipeline board is the navigation.
- **Reason:** At Prod scope with one user's job search, a Kanban board is scannable without search. This is a nice-to-have.

### Resume builder cut

- **Reference does:** Not present in the reference; explicitly excluded in scoping.
- **We chose to:** Not implement resume editing or creation.
- **Reason:** Explicitly excluded in scoping. Outside the core loop entirely.

### LinkedIn and social feed integration cut

- **Reference does:** Not present in the reference.
- **We chose to:** Not integrate with LinkedIn or any social platform.
- **Reason:** Explicitly excluded in scoping. Adds fragility without serving the core loop.

### LLM email parsing cut; regex retained

- **Reference does:** Regex-based parsing (no LLM calls in the reference).
- **We chose to:** Keep regex-based parsing on the server side. No LLM API calls.
- **Reason:** Scope excluded "AI recommendations not grounded in real data" and "too many autonomous agents." Regex is fast, predictable, and sufficient for standard job-application email patterns.

## Technical decisions

### Stack: React + Vite + Express + Supabase

- **We chose:** React (Vite) on the frontend, Express on the backend, Supabase for Postgres and auth.
- **Reason:** Sprint Zero v1 ships one stack. Users bring their own Supabase project. Five minutes of setup, no server-side maintenance.

### UI library: shadcn/ui + Tailwind CSS

- **We chose:** shadcn/ui with Tailwind CSS, replacing hand-written inline style objects.
- **Reason:** The growing component surface (modals, selects, badges, alerts) benefits from a consistent, accessible component system. shadcn/ui gives us copy-owned components — no runtime library lock-in — built on Radix UI primitives with full keyboard navigation and ARIA support out of the box. Tailwind replaces ~600 lines of inline style objects with composable utility classes. The indigo color token (`#6366f1`) is preserved via CSS variables so the visual design is unchanged. Future components can be added with `npx shadcn@latest add <component>`.

### Google Sign-In as the single auth and Gmail access mechanism

- **We chose:** `supabase.auth.signInWithOAuth({ provider: 'google' })` with `scopes: 'https://www.googleapis.com/auth/gmail.readonly'`. One consent screen, one session, no separate "Connect Gmail" step. The Supabase session's `provider_token` is the Google access token for Gmail API calls.
- **Reason:** Users sign in with Google once and both problems are solved simultaneously. A separate Gmail OAuth flow (the reference's approach) doubles the setup friction — the user would have to configure a Google Cloud project, set a redirect URI, and go through two OAuth flows. Supabase handles the Google OAuth flow natively when the provider is configured in the dashboard.

### Google access token passed to backend on sync, not stored

- **We chose:** The frontend passes `session.provider_token` (the Google access token) in the body of `POST /api/gmail/sync`. The backend uses it for that request only and never persists it.
- **Reason:** Avoids a separate `gmail_tokens` table and token refresh logic on the backend. The Supabase session already handles token refresh — the frontend refreshes the session and gets a fresh `provider_token` when needed. This keeps the backend stateless with respect to Google tokens.

### Testing: Playwright via MCP

- **We chose:** Playwright driven by the QA sub-agent through the Playwright MCP.
- **Reason:** Browser-driven tests catch the real user journey, including the auth dance and Gmail OAuth redirect. MCP means the agent drives the browser without wiring a test framework by hand.

### Build level: Prod

- **We chose:** Prod.
- **Reason:** The user confirmed that Gmail OAuth is a core, required feature. At Prod level we add error boundaries, loading states, input validation, and at least one error-path test per core loop — the right level when real OAuth flows and external API calls are in play.

### Email parsing: server-side, on sync

- **We chose:** Gmail email parsing runs in the Express backend when a sync is triggered. Pattern matching happens against email subjects and snippets, not full HTML bodies.
- **Reason:** Keeps the frontend simple. The server calls Gmail API, parses, writes applications to Supabase, and returns the result. The client just polls or receives a list of created records.

## What we'd add next

1. **Search and filter on the pipeline** — a user with 30+ applications needs to find things quickly. One input field, filter by company or role.
2. **Export to CSV** — frequently useful; simple server-side join + CSV write.
3. **Background Gmail sync (cron or webhook)** — currently sync is on-demand. A periodic background sync would keep the pipeline current without the user having to click "Sync".
4. **Email reminders / follow-up nudges** — send a notification when an application hasn't moved in 7+ days. Requires a background job; high impact for users who forget to check.
5. **Multiple pipelines** — let users name and separate pipelines (e.g., "Q1 2025 Search", "Internships"). Low effort once the data model is in place.
