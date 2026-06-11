# User stories

_Level: Prod. Expanded from `docs/prd.md`._

---

## Must-have

### Story 1 — Sign in with Google

**Story:** As a new or returning user, I want to sign in with my Google account so that I am authenticated and Gmail access is granted in a single step.

**Acceptance criteria:**

- Given I navigate to `/login`, then I see a "Sign in with Google" button.
- Given I click "Sign in with Google", then I am redirected to Google's OAuth consent screen which requests gmail.readonly access.
- Given I complete the consent flow, then a Supabase session is created with a `provider_token` (Google access token) and I am redirected to `/pipeline`.
- Given I deny the consent screen, then I am returned to `/login` with a message: "Sign-in was cancelled."
- Given I navigate to `/pipeline` while unauthenticated, then I am redirected to `/login`.
- _Error path:_ Given Google's OAuth returns an error code, then I land on `/login` with a message: "Sign-in failed. Please try again."

**Priority:** Must-have
**Effort:** Small

---

### Story 2 — Session persists across reload

**Story:** As a signed-in user, I want my session to persist when I reload the page so that I don't have to log in every time.

**Acceptance criteria:**

- Given I am logged in and on `/pipeline`, when I reload the page, then I land back on `/pipeline` — not on `/login`.
- Given I am logged in and navigate directly to `/`, then I am redirected to `/pipeline`.
- Given my session is active and I close and reopen the browser tab, then I remain logged in.

**Priority:** Must-have
**Effort:** Small

---

### Story 3 — Log out

**Story:** As a signed-in user, I want to log out so that my session ends and no one else can access my pipeline.

**Acceptance criteria:**

- Given I am logged in and on `/pipeline`, then I see a "Log out" button in the navigation.
- Given I click "Log out", then my Supabase session is destroyed and I am redirected to `/login`.
- Given I attempt to navigate to `/pipeline` after logging out, then I am redirected to `/login`.

**Priority:** Must-have
**Effort:** Small

---

### Story 5 — Auto Gmail sync on first sign-in

**Story:** As a user who just signed in with Google, I want the app to automatically scan my Gmail inbox so that my pipeline populates immediately without any extra steps.

**Acceptance criteria:**

- Given I complete the Google sign-in flow and land on `/pipeline`, then a Gmail sync begins automatically using the `provider_token` from my session.
- Given the sync is in progress, then a loading indicator is shown in the navbar ("Scanning your inbox...").
- Given the sync completes, then application cards appear in the pipeline and the loading indicator disappears.
- Given an email has already been imported (matched by Gmail message ID), then it is not duplicated on re-sync.
- _Error path:_ Given the Gmail API returns an error during the auto-sync, then the loading indicator disappears and a message reads "Gmail sync failed. Try again."

**Priority:** Must-have
**Effort:** Medium

---

### Story 6 — Trigger a manual Gmail re-sync

**Story:** As a signed-in user, I want to trigger a Gmail re-sync at any time so that new emails are pulled in on demand.

**Acceptance criteria:**

- Given I am on `/pipeline`, then I see a "Sync Gmail" button in the navbar.
- Given I click "Sync Gmail", then `POST /api/gmail/sync` is called with the current `provider_token` and a loading indicator is shown.
- Given the sync completes, then new cards appear in the pipeline and the button returns to its idle state.
- Given a sync is already running, then the button is disabled until it completes.
- _Error path:_ Given the sync fails (API returns 503), then the error message "Gmail sync failed. Try again." is shown and the button re-enables.

**Priority:** Must-have
**Effort:** Small

---

### Story 7 — Add a job application manually

**Story:** As a job seeker, I want to add a job application by entering company name and role so that I can track positions I applied to without Gmail.

**Acceptance criteria:**

- Given I am on `/pipeline`, then I see an "Add application" button.
- Given I click "Add application", then a modal opens with: Company (required), Role (required), Stage (dropdown, defaults to "Applied"), Date Applied (defaults to today), Notes (optional).
- Given I fill in Company and Role and submit, then the modal closes and a new card appears in the "Applied" column.
- Given I submit with Company blank, then the Company field is highlighted with an error and the form does not submit.
- Given I submit with Role blank, then the Role field is highlighted with an error and the form does not submit.
- Given the card is saved, then it persists when I reload the page.
- _Error path:_ Given the API returns an error on save, then an inline error reads "Could not save application. Please try again." and the form data is not lost.

**Priority:** Must-have
**Effort:** Small

---

### Story 8 — Add application via email paste

**Story:** As a job seeker, I want to paste email content so that the app pre-fills company, role, and stage without me typing it all.

**Acceptance criteria:**

- Given I open the "Add application" modal, then I see a "Paste email" section or tab with a textarea labelled "Paste email content here".
- Given I paste email text containing a company name and job role and click "Extract", then the Company and Role fields are pre-filled.
- Given the email body contains "thank you for applying" or "we received your application", then Stage defaults to "Applied".
- Given the email contains "interview" or "schedule a call", then Stage defaults to "Phone Screen" or "Interview".
- Given the email contains "unfortunately" or "not moving forward", then Stage defaults to "Rejected".
- Given extraction finds no confident match, then the form fields remain blank and no error is shown.
- Given I confirm the pre-filled form (editing if needed) and submit, then the card is created as in Story 8.

**Priority:** Must-have
**Effort:** Medium

---

### Story 10 — View all applications in the pipeline

**Story:** As a job seeker, I want to see all my applications in a Kanban-style pipeline grouped by stage so that I can see my full search at a glance.

**Acceptance criteria:**

- Given I am on `/pipeline`, then I see five columns: Applied, Phone Screen, Interview, Offer, Rejected.
- Given I have applications saved, then each appears as a card in the column matching its current stage.
- Given I have no applications, then an empty state reads "No applications yet" with an "Add application" prompt.
- Given each card, then it displays: company name, role title, date applied, and next action label.
- Given more than 5 cards exist in one column, then the column scrolls independently without affecting other columns.
- _Error path:_ Given the GET /applications API returns an error, then an error state reads "Could not load your pipeline." with a "Retry" button.

**Priority:** Must-have
**Effort:** Medium

---

### Story 11 — Move application to a different stage

**Story:** As a job seeker, I want to move an application from one stage to another so that the board reflects where each application actually stands.

**Acceptance criteria:**

- Given an application card, then I see a "Move to" dropdown showing the other four stages.
- Given I select a new stage from the dropdown and confirm, then the card moves to the corresponding column immediately.
- Given the stage is updated, then the change persists after page reload.
- _Error path:_ Given the stage update API call fails, then the card reverts to its previous column and a message reads "Could not update stage. Please try again."

**Priority:** Must-have
**Effort:** Small

---

### Story 12 — See next action on each application card

**Story:** As a job seeker, I want each application card to show a "next action" label so that I always know what to do next.

**Acceptance criteria:**

- Given an application in "Applied" created 5+ days ago, then the next action label reads "Follow up".
- Given an application in "Applied" created < 5 days ago, then the next action label reads "Awaiting response".
- Given an application in "Phone Screen", then the label reads "Prepare for call".
- Given an application in "Interview", then the label reads "Prepare for interview".
- Given an application in "Offer", then the label reads "Respond to offer".
- Given an application in "Rejected", then no next action label is shown.
- Given I move an application to a new stage, then the next action label updates immediately without a page reload.

**Priority:** Must-have
**Effort:** Small

---

### Story 13 — Highlight applications that need attention

**Story:** As a job seeker, I want applications that haven't moved in 7+ days to be visually flagged so that I know what needs attention.

**Acceptance criteria:**

- Given an application that has not changed stage in 7 or more days and is not in "Offer" or "Rejected", then its card displays a visible stale indicator (e.g. a coloured border or badge).
- Given I hover over the stale indicator, then a tooltip reads "No update in 7+ days".
- Given I move the application to a new stage, then the stale indicator is removed immediately.
- Given an application is in "Offer" or "Rejected", then no stale indicator appears regardless of age.

**Priority:** Must-have
**Effort:** Small

---

## Should-have

### Story 14 — Add a note to an application

**Story:** As a job seeker, I want to add or edit a note on an application so that I can keep context like interview feedback or a contact's name.

**Acceptance criteria:**

- Given I click an application card or an "Edit" button, then a detail modal opens with all fields including a Notes textarea.
- Given I type in the Notes field and click "Save", then the note is stored and visible the next time I open the card.
- Given I clear the notes field and save, then the note is removed.

**Priority:** Should-have
**Effort:** Small

---

### Story 15 — Edit application details

**Story:** As a job seeker, I want to edit an application's company, role, date, and notes after creating it so that I can correct mistakes.

**Acceptance criteria:**

- Given I open an application's edit modal, then Company, Role, Stage, Date Applied, and Notes are all editable.
- Given I change a field and click "Save", then the card in the pipeline reflects the updated values.
- Given I close the modal without saving, then no changes are applied.

**Priority:** Should-have
**Effort:** Small

---

### Story 16 — Delete an application

**Story:** As a job seeker, I want to delete an application so that my pipeline stays clean.

**Acceptance criteria:**

- Given I open an application's edit modal, then I see a "Delete" button.
- Given I click "Delete" and confirm a prompt ("Are you sure?"), then the card is removed from the pipeline.
- Given I reload the page, then the deleted application is no longer present.

**Priority:** Should-have
**Effort:** Small

---

### Story 17 — See application count per stage

**Story:** As a job seeker, I want to see how many applications are in each stage so that I can gauge the volume of my search.

**Acceptance criteria:**

- Given I am on `/pipeline`, then each column header shows the count of cards in that column, e.g. "Applied (4)".
- Given I add, move, or delete an application, then the count in the relevant column(s) updates immediately.

**Priority:** Should-have
**Effort:** Small

---

## Nice-to-have

- As a job seeker, I want to filter the pipeline by company name or role so that I can find a specific application quickly.
- As a job seeker, I want a summary view showing total applications, active count, rejected count, and offer count.
- As a job seeker, I want to attach a job posting URL to an application for easy reference.

---

## Edge cases to discuss

- **Gmail token expiry during sync:** If the Gmail access token expires mid-sync and the refresh token is invalid (user revoked access), the backend should surface a reconnect prompt rather than silently failing.
- **Duplicate imports:** The deduplication key is the Gmail message ID. If the same role is emailed twice (a follow-up), it creates a second card. Should the sync merge threads? For MVP: no — let the user manage duplicates manually.
- **Stale indicator clock reset:** Does the 7-day clock reset on any field update (notes, company name edit) or only on stage change? Recommendation: stage change only, so the signal stays meaningful.
- **No Gmail credentials in `.env`:** The app must degrade gracefully if `GOOGLE_CLIENT_ID` is missing — hide the "Connect Gmail" button and log a server-side warning rather than crashing.
- **Prod error paths:** Every must-have story above has at least one error-path criterion. Ensure QA tests each of them in the Playwright suite.

---

## Questions for the team

1. Should drag-and-drop be implemented for moving cards between columns, or is a "Move to" dropdown sufficient for this scope? `[NEEDS CLARIFICATION]` — defaulting to dropdown for now to reduce frontend complexity.
2. Should Gmail sync run automatically on each login (in addition to manual), or only on demand? Defaulting to: auto on first connect, manual thereafter.
3. Should the Gmail OAuth callback use the same Supabase user session to associate the token, or is a separate session-cookie handshake needed? This affects the callback route implementation.
