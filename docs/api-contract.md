# API contract

_Sprint Zero build. Stack: Express + Supabase. Level: Prod._

---

## Auth

All user authentication is handled client-side via `@supabase/supabase-js` using Google as the OAuth provider. The Express backend does NOT expose `/auth/*` routes.

Sign-in flow: `supabase.auth.signInWithOAuth({ provider: 'google', options: { scopes: 'https://www.googleapis.com/auth/gmail.readonly', queryParams: { access_type: 'offline', prompt: 'consent' } } })`. This produces a Supabase session with `session.provider_token` = the Google access token for Gmail API calls.

Protected endpoints require an `Authorization: Bearer <token>` header. The token is the Supabase session access token (`session.access_token`). Express middleware validates it against Supabase's JWKS. Invalid or expired tokens return `401 Unauthorized`.

Every entity is scoped to the authenticated user by `user_id`. List endpoints return only the current user's records. Ownership is checked on every write.

---

## Base URL

`http://localhost:3001/api` (development). Production URL is environment-configured.

---

## Entities

- `Application` — a tracked job application belonging to a user, with a stage, company, role, and optional metadata.
- `UserMeta` — stores per-user metadata (e.g. `last_synced_at`). One row per user. Not returned in application responses.

---

## Gmail endpoints

### POST /api/gmail/sync

**Purpose:** Trigger a Gmail inbox scan using the Google access token from the signed-in session. Creates new `Application` records for any unimported emails. Also updates `last_synced_at` for the user.
**Auth:** Required (Supabase Bearer token)
**Request body:**
```json
{
  "google_token": "ya29.a0AfH6SM..."
}
```
- `google_token` — required. This is `session.provider_token` from the Supabase client. The backend uses it to call the Gmail API on behalf of the user. It is never stored.

**Response:**
```json
{
  "imported": 3,
  "skipped": 7,
  "last_synced_at": "2026-06-10T14:22:00Z",
  "applications": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "company": "Acme Corp",
      "role": "Product Manager",
      "stage": "applied",
      "date_applied": "2026-06-01T00:00:00Z",
      "next_action": "Awaiting response",
      "stale": false,
      "created_at": "2026-06-10T14:22:00Z"
    }
  ]
}
```
**Error responses:**
- `400 Bad Request` — `{ "error": "validation_error", "message": "google_token is required." }`
- `401 Unauthorized` — expired Supabase session
- `503 Service Unavailable` — `{ "error": "gmail_sync_failed", "message": "Gmail sync failed. Try again." }` if the Gmail API call fails or the google_token is invalid/expired

**Notes:**
- Deduplication key is the Gmail `message_id`. Already-imported messages are counted in `skipped` and not re-inserted.
- The `google_token` is used only for this request and is never persisted to the database.
- `last_synced_at` is stored per user in a `user_meta` table (user_id, last_synced_at).

---

### GET /api/gmail/last-synced

**Purpose:** Return the last Gmail sync timestamp for the current user, so the frontend can show "Last synced: X minutes ago".
**Auth:** Required
**Request body:** none
**Response:**
```json
{
  "last_synced_at": "2026-06-10T14:22:00Z"
}
```
or `{ "last_synced_at": null }` if never synced.
**Error responses:**
- `401 Unauthorized`

---

## Application endpoints

### GET /api/applications

**Purpose:** Return all applications for the authenticated user, grouped by stage for the pipeline view.
**Auth:** Required
**Request body:** none
**Response:**
```json
{
  "applications": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "company": "Acme Corp",
      "role": "Product Manager",
      "stage": "applied",
      "date_applied": "2026-06-01T00:00:00Z",
      "notes": "Referred by Jamie.",
      "next_action": "Follow up",
      "stale": true,
      "gmail_message_id": null,
      "created_at": "2026-05-30T09:00:00Z",
      "updated_at": "2026-06-01T11:00:00Z"
    }
  ]
}
```
**Error responses:**
- `401 Unauthorized`
- `500 Internal Server Error` — `{ "error": "db_error", "message": "Could not load applications." }`

**Notes:** `next_action` and `stale` are computed fields derived on the server from `stage` and `updated_at`. Not stored in the database.

---

### GET /api/applications/:id

**Purpose:** Return a single application by ID.
**Auth:** Required
**Request body:** none
**Response:**
```json
{
  "application": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "company": "Acme Corp",
    "role": "Product Manager",
    "stage": "applied",
    "date_applied": "2026-06-01T00:00:00Z",
    "notes": "Referred by Jamie.",
    "next_action": "Follow up",
    "stale": true,
    "gmail_message_id": null,
    "created_at": "2026-05-30T09:00:00Z",
    "updated_at": "2026-06-01T11:00:00Z"
  }
}
```
**Error responses:**
- `401 Unauthorized`
- `404 Not Found` — `{ "error": "not_found", "message": "Application not found." }`

---

### POST /api/applications

**Purpose:** Create a new application manually or from parsed email content.
**Auth:** Required
**Request body:**
```json
{
  "company": "Meridian Health",
  "role": "UX Designer",
  "stage": "applied",
  "date_applied": "2026-06-10",
  "notes": "Found on LinkedIn."
}
```
- `company` — required, string, max 200 chars
- `role` — required, string, max 200 chars
- `stage` — optional, one of `applied | phone_screen | interview | offer | rejected`; defaults to `applied`
- `date_applied` — optional, ISO 8601 date string; defaults to today
- `notes` — optional, string, max 2000 chars

**Response:** `201 Created`
```json
{
  "application": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "company": "Meridian Health",
    "role": "UX Designer",
    "stage": "applied",
    "date_applied": "2026-06-10T00:00:00Z",
    "notes": "Found on LinkedIn.",
    "next_action": "Awaiting response",
    "stale": false,
    "gmail_message_id": null,
    "created_at": "2026-06-10T15:00:00Z",
    "updated_at": "2026-06-10T15:00:00Z"
  }
}
```
**Error responses:**
- `400 Bad Request` — `{ "error": "validation_error", "message": "company is required." }`
- `401 Unauthorized`
- `500 Internal Server Error` — `{ "error": "db_error", "message": "Could not save application." }`

---

### PUT /api/applications/:id

**Purpose:** Update an existing application's fields (company, role, stage, date, notes).
**Auth:** Required
**Request body:** (all fields optional; only include what changes)
```json
{
  "stage": "interview",
  "notes": "Interview scheduled for June 15."
}
```
**Response:** `200 OK`
```json
{
  "application": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "company": "Acme Corp",
    "role": "Product Manager",
    "stage": "interview",
    "date_applied": "2026-06-01T00:00:00Z",
    "notes": "Interview scheduled for June 15.",
    "next_action": "Prepare for interview",
    "stale": false,
    "gmail_message_id": null,
    "created_at": "2026-05-30T09:00:00Z",
    "updated_at": "2026-06-10T15:05:00Z"
  }
}
```
**Error responses:**
- `400 Bad Request` — `{ "error": "validation_error", "message": "stage must be one of: applied, phone_screen, interview, offer, rejected." }`
- `401 Unauthorized`
- `404 Not Found` — `{ "error": "not_found", "message": "Application not found." }`
- `500 Internal Server Error` — `{ "error": "db_error", "message": "Could not update application." }`

---

### DELETE /api/applications/:id

**Purpose:** Permanently delete an application.
**Auth:** Required
**Request body:** none
**Response:** `204 No Content`
**Error responses:**
- `401 Unauthorized`
- `404 Not Found` — `{ "error": "not_found", "message": "Application not found." }`
- `500 Internal Server Error` — `{ "error": "db_error", "message": "Could not delete application." }`

---

### POST /api/applications/parse-email

**Purpose:** Parse pasted email text and return pre-filled application fields. Does NOT save anything.
**Auth:** Required
**Request body:**
```json
{
  "email_text": "Hi Alex, thank you for applying to the Product Manager role at Acme Corp. We'll be in touch soon."
}
```
**Response:**
```json
{
  "company": "Acme Corp",
  "company_confidence": "high",
  "role": "Product Manager",
  "role_confidence": "high",
  "stage": "applied",
  "stage_confidence": "medium",
  "confidence": "high"
}
```
- `confidence` is one of `high | low` (backward-compat field). `high` when at least one of `company` or `role` is non-null.
- `company_confidence`, `role_confidence`, `stage_confidence` are each one of `high | medium | low`:
  - `high` — extracted from the email subject (most reliable signal)
  - `medium` — extracted from the email body, signature block, or sender domain
  - `low` — not found; field is `null` (or defaulted to `"applied"` for stage)
- When overall `confidence` is `low`, the frontend should leave the fields blank and let the user fill them.
**Error responses:**
- `400 Bad Request` — `{ "error": "validation_error", "message": "email_text is required." }`
- `401 Unauthorized`

**Notes:** Always returns `200 OK` with partial or empty fields — never a 5xx for low-confidence parsing. A failed parse returns `{ "company": null, "company_confidence": "low", "role": null, "role_confidence": "low", "stage": null, "stage_confidence": "low", "confidence": "low" }`.

---

## Conventions

- All request and response bodies are JSON.
- Timestamps are ISO 8601 strings (e.g. `"2026-06-10T14:22:00Z"`).
- IDs are UUID v4 strings (Supabase default).
- The backend never returns `user_id` in response bodies — it is implicit from the session.
- `stage` values are lowercase snake_case: `applied`, `phone_screen`, `interview`, `offer`, `rejected`.
- `POST` returns `201 Created` with the created resource.
- `PUT` returns `200 OK` with the updated resource.
- `DELETE` returns `204 No Content`.
- Error responses use shape: `{ "error": "short_code", "message": "Human readable." }`.
- `next_action` and `stale` are computed on the server and included in every application response. They are never sent in request bodies.

---

## What agents must NOT do

- Do not add or remove endpoints without updating this file first.
- Do not change response shapes. The frontend and backend engineers build against this document in parallel — shape drift breaks the build.
- Do not skip JWT middleware on any protected route.
- Do not return Gmail tokens (access_token, refresh_token) in any response body.
- Do not implement `/auth/*` routes on Express — Supabase Auth owns that client-side.

---

## Environment variables required

```
# .env (root) — copied to server/.env and client/.env by setup
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
DATABASE_URL=...

# Google OAuth — used by Supabase Auth Google provider (configured in Supabase dashboard)
# The backend does NOT call Google OAuth directly; these are only needed for Supabase setup reference.
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

The Google OAuth app must be configured in the Supabase dashboard under Authentication → Providers → Google, using the `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Supabase handles the redirect URI internally (`<SUPABASE_URL>/auth/v1/callback`). The backend itself does not run any OAuth redirect routes.
