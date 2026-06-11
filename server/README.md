# InterviewOS — server

Express backend for InterviewOS. Runs on port 3001.

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project. Once created, enable Google auth:

Authentication -> Providers -> Google -> Enable

Configure your Google OAuth credentials (Client ID and Secret from Google Cloud Console) in the Google provider settings.

### 2. Copy credentials

Copy `server/.env.example` to `server/.env` and fill in these four values:

- `SUPABASE_URL` — from Settings -> API -> Project URL
- `SUPABASE_PUBLISHABLE_KEY` — from Settings -> API Keys (anon/public key)
- `SUPABASE_SECRET_KEY` — from Settings -> API Keys (service_role key)
- `DATABASE_URL` — from Settings -> Database -> Connection string -> URI (Session mode, port 5432). It looks like `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`. If your password contains special characters like `[` `]` `$` `#` `@`, percent-encode them (e.g. `%24` for `$`, `%5B` for `[`).

### 3. Migrate and seed

```
cd server
node seed.js
```

This command creates the database tables automatically (runs `migrate.js` first), then creates a demo user and populates 8 sample applications across all pipeline stages. The demo user's credentials are printed to stdout on completion.

Demo credentials: `demo@interviewos.app` / `Demo1234!`

Note: the demo user logs in with email/password. Real users will use Google Sign-In.

### 4. Start the server

```
node index.js
```

or

```
npm start
```

The server listens on port 3001 and accepts requests from `http://localhost:5173`.

## Endpoints

All endpoints are documented in `docs/api-contract.md`.

Base URL: `http://localhost:3001/api`

Protected routes require `Authorization: Bearer <token>` (Supabase session access token).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/gmail/sync | Required | Scan Gmail inbox using provider_token, import applications |
| GET | /api/gmail/last-synced | Required | Return last sync timestamp for the user |
| GET | /api/applications | Required | List all applications for the user |
| GET | /api/applications/:id | Required | Get one application by ID |
| POST | /api/applications | Required | Create a new application manually |
| PUT | /api/applications/:id | Required | Update an existing application |
| DELETE | /api/applications/:id | Required | Hard-delete an application |
| POST | /api/applications/parse-email | Required | Parse pasted email text, return pre-filled fields (does not save) |

## Architecture notes

- Google Sign-In is handled entirely by Supabase Auth on the client side. The backend has no `/auth/*` or `/api/gmail/connect` routes.
- `POST /api/gmail/sync` accepts `{ google_token }` in the body — this is `session.provider_token` from the Supabase session. The token is used for that one request only and is never stored or logged.
- `next_action` and `stale` are computed fields derived server-side from `stage` and `updated_at`. They are never stored in the database.
- The `user_id` field is never returned in response bodies.
