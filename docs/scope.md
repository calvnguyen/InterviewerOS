# Sprint Zero — Scope

## Reference

- **Company URL:** https://github.com/Tomiwajin/CareerSync
- **Repo URL:** https://github.com/Tomiwajin/CareerSync

## Build level

**Prod**

MVP plus error boundaries, loading states, input validation, and Playwright happy path + one error path per core loop. Google Sign-In is the only auth method — users log in with their Google account, which also grants Gmail read access in a single flow.

## Core loop

A job seeker signs in with Google (Supabase Google OAuth, requesting gmail.readonly scope). The app immediately scans their Gmail inbox for job-related emails and populates their pipeline. They can also add applications manually or via pasted email text. From the pipeline they move applications through stages and see a clear next action on each card.

## Excludes

- No auto-applying to jobs
- No LinkedIn or social feed features
- No enterprise ATS complexity
- No bloated analytics dashboards
- No LLM calls — use regex-based email parsing only
- No full resume builder
- No autonomous agents
- Focus on clarity, tracking, and next actions only

## Assumptions made during scoping

- [ASSUMED] Core loop interpreted as: user adds a job application → it appears in a Kanban-style pipeline → a next action is surfaced. This is the minimum that must work end-to-end.
- [ASSUMED] "Turn scattered job emails into a pipeline" scoped to paste-in email content for MVP (no live Gmail/OAuth integration) to avoid fragile scraping.
