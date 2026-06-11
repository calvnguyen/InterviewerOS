# CareerSync — PRD

_Built with Sprint Zero. Reference: CareerSync (Tomiwajin). Level: Prod._

## 1. Problem statement

Active job seekers apply to many roles simultaneously but have no reliable system for tracking where each application stands. Emails pile up, stages get confused, and follow-up timing slips. The result is missed interviews, forgotten applications, and anxiety about the overall search. CareerSync solves this by connecting directly to the user's Gmail, automatically extracting job applications from their inbox, and presenting them in a Kanban pipeline with a clear next action on every card. The user can also add applications manually or paste in email text. Everything persists across sessions and the user always knows what needs attention.

## 2. Goals

- Enable a job seeker to sign in with Google and see their Gmail-populated pipeline within 2 minutes of first login.
- Enable a user to move an application through stages (Applied, Phone Screen, Interview, Offer, Rejected) with a single action.
- Surface a "next action" on every in-progress application so the user always knows what to do next.
- Persist all application data across sessions so the pipeline is the user's source of truth, not their inbox.
- Provide manual add and email-paste intake paths so the pipeline works for all applications, not just emailed ones.

## 3. Non-goals

This build will NOT do any of the following:

- Auto-apply to jobs on behalf of the user.
- Integrate with LinkedIn, job boards, or social feeds.
- Call any LLM or AI API — email parsing uses regex only.
- Build a resume editor or cover letter generator.
- Run autonomous agents.
- Provide complex analytics dashboards, conversion-rate charts, or advanced reporting.
- Replicate enterprise ATS features (collaborative hiring, multiple reviewers, custom pipelines).
- Export data to Excel, CSV, or Google Sheets.

## 4. Users & use cases

**The active job seeker with a busy inbox.** This person applies to many roles and receives a constant stream of recruiter emails, confirmations, and rejections. They want to connect Gmail once and have their pipeline auto-populate. They open the app each morning, see where everything stands, move a few cards, and close the tab. They don't want to copy-paste anything.

**The job seeker who doesn't want to give Gmail access.** This person prefers to control intake manually. They log in, click "Add application", fill in company and role, and maybe paste in an email body to pre-fill the details. Their pipeline is built by hand but still gives them the same pipeline and next-action view.

**The returner checking in weekly.** This person opens the app once a week to review what changed, move stalled applications to a "no response" bucket, and decide which open applications to follow up on. They primarily benefit from the stale-application highlighting and the next-action labels.

## 5. User stories

### Must-have

**Auth + Gmail (one flow)**

- As a new user, I want to sign in with my Google account so that I am authenticated and Gmail access is granted in a single step — no separate "connect Gmail" step.
- As a returning user, I want to sign in with Google so that I land directly on my pipeline.
- As a signed-in user, I want my session to persist across reloads so that I don't have to sign in every time.
- As a signed-in user, I want to log out so that my session ends.

**Gmail inbox scan**

- As a signed-in user, I want the app to scan my Gmail inbox on first login so that my pipeline populates automatically.
- As a signed-in user, I want to trigger a Gmail re-sync at any time so that new emails are pulled in on demand.

**Core loop — adding applications**

- As a job seeker, I want to add a job application manually (company, role, status, optional notes) so that I can track roles I applied to directly without Gmail.
- As a job seeker, I want to paste email content into a text field so that the app pre-fills the company name, role, and a suggested status without me typing it all.
- As a job seeker, I want to see all my applications in a Kanban-style pipeline grouped by stage so that I can see my full search at a glance.

**Core loop — managing the pipeline**

- As a job seeker, I want to move an application from one pipeline stage to another so that the board reflects where each application actually stands.
- As a job seeker, I want each application card to show a "next action" label so that I always know what to do next.
- As a job seeker, I want applications that have not moved in 7+ days to be flagged so that I know what needs attention.

### Should-have

- As a job seeker, I want to add a note to any application so that I can record context (interview feedback, contact name, etc.).
- As a job seeker, I want to edit an application's details after creating it so that I can correct mistakes.
- As a job seeker, I want to delete an application so that my pipeline stays clean.
- As a job seeker, I want to see a count of applications per stage so that I can gauge my search volume.

### Nice-to-have

- As a job seeker, I want to filter the pipeline by company name or role so that I can find a specific application quickly.
- As a job seeker, I want a summary view of applications sent, active, rejected, and offered.
- As a job seeker, I want to attach a job posting URL to an application for reference.

## 6. Acceptance criteria

**Sign in with Google**
- Given I navigate to `/login`, then I see a "Sign in with Google" button.
- Given I click "Sign in with Google", then I am redirected to Google's OAuth consent screen requesting gmail.readonly access.
- Given I complete the consent flow, then a Supabase session is created (with `provider_token` = Google access token) and I am redirected to `/pipeline`.
- Given I deny the consent screen, then I am returned to `/login` with a message: "Sign-in was cancelled."
- _Error path:_ Given Google's OAuth returns an error, then I land on `/login` with a message: "Sign-in failed. Please try again."

**Session persistence**
- Given I am signed in and reload the page, then I land on `/pipeline` — not `/login`.
- Given the Supabase session token is valid, then API calls to Express succeed with 200.

**Log out**
- Given I am signed in and click "Log out", then my Supabase session ends and I am redirected to `/login`.
- Given I navigate to `/pipeline` after logging out, then I am redirected to `/login`.

**Gmail sync**
- Given I have just signed in, then an automatic Gmail scan runs immediately and populates the pipeline.
- Given a sync runs, then any emails matching job application patterns are parsed and application cards are created.
- Given an email has already been imported (same Gmail message ID), then it is not duplicated on subsequent syncs.
- Given a sync is in progress, then a loading indicator is shown.
- _Error path:_ Given the Gmail API returns an error, then the user sees "Gmail sync failed. Try again." with a retry button.

**Add application manually**
- Given I click "Add application" and fill in Company (required) and Role (required) and submit, then a new card appears in the "Applied" column.
- Given I submit with Company blank, then the form shows a validation error and does not submit.
- _Error path:_ Given the server returns an error on save, then an error message is shown and the form data is not lost.

**Paste email intake**
- Given I paste email text and click "Extract", then Company, Role, and Stage are pre-filled from the text.
- Given no match is found, then the form falls back to blank fields silently.
- Given I confirm the form, then the card is created as in manual add.

**Pipeline view**
- Given I am on `/pipeline`, then I see five columns: Applied, Phone Screen, Interview, Offer, Rejected.
- Given I have no applications, then an empty state with "No applications yet" and an "Add application" prompt is shown.
- _Error path:_ Given the API returns an error loading applications, then an error state is shown with a "Retry" button.

**Move application**
- Given I select a new stage and confirm, then the card moves to the new column and the change persists after reload.
- _Error path:_ Given the stage update API call fails, then the card reverts to its previous column and an error message is shown.

**Next action label**
- Given an application in "Applied" added 5+ days ago, then the label reads "Follow up".
- Given an application in "Applied" added < 5 days ago, then the label reads "Awaiting response".
- Given an application in "Phone Screen", then the label reads "Prepare for call".
- Given an application in "Interview", then the label reads "Prepare for interview".
- Given an application in "Offer", then the label reads "Respond to offer".
- Given an application in "Rejected", then no next action label is shown.

**Needs attention highlight**
- Given an application has not changed stage in 7+ days and is not in Offer or Rejected, then its card displays a stale indicator.
- Given I move an application to a new stage, then the stale indicator is removed immediately.

## 7. Risks & assumptions

**Risks**

- Gmail OAuth requires a verified Google Cloud project. During development, the app runs in "testing" mode and only pre-authorised accounts can connect. This is fine for MVP demo; real users require Google's OAuth app review.
- Gmail API rate limits: standard quota is 250 units/second per user. At demo scale this is not a concern.
- Regex-based email parsing will miss unusual formats or non-English emails. The fallback is manual entry.
- Supabase free tier has row and request limits; no concern at demo scale.

**Assumptions**

- `[ASSUMPTION]` Gmail OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`) are provided by the user in `.env`.
- `[ASSUMPTION]` Gmail tokens are stored encrypted or in a server-side table, not exposed to the client.
- `[ASSUMPTION]` All applications belong to the authenticated user — no shared pipelines.
- `[ASSUMPTION]` "Next action" logic is rule-based (stage + days since last update), not AI-generated.
- `[ASSUMPTION]` One pipeline per user (no named or multiple pipelines).
- `[ASSUMPTION]` Gmail sync imports read-only — the app never writes to Gmail.

## 8. Open questions

- Should drag-and-drop be implemented for moving cards, or is a "Move to" dropdown sufficient? `[NEEDS INPUT]` — defaulting to dropdown for MVP; can upgrade to DnD post-demo.
- Should archived applications be soft-deleted (hidden, recoverable) or hard-deleted? Defaulting to hard delete for simplicity.
- Should Gmail sync run automatically on each login, or only when the user clicks "Sync Gmail"? Defaulting to: auto-sync on first connect, manual sync thereafter.

## 9. Success metrics

**Leading indicator:** A new user connects Gmail, sees at least one imported application in their pipeline, and moves it to a new stage — all within the first session.

**Lagging indicator:** A returning user's pipeline data is intact across sessions and the Gmail connection persists, confirming persistence and token refresh are working.
