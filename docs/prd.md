# InterviewerOS — Product Requirements Document

## Overview

InterviewerOS is an AI-powered job search workspace that helps users manage applications, interviews, resumes, recruiter communication, and interview preparation in one place.

The core experience is Gmail-first: users securely connect their own Google account and InterviewOS automatically scans recruiter and job-related emails to build a centralized application pipeline.

The product focuses on reducing job-search anxiety, eliminating manual tracking, and helping users always know where they stand, what happened recently, and what they should do next.

## Product Vision

Job searching today is fragmented: applications live across job boards, recruiter emails are buried in Gmail, resumes are spread across folders, interview prep exists in notes/docs, and follow-ups are easy to forget.

InterviewerOS centralizes the workflow into a single intelligent workspace.

## Core User Flow

1. User signs in with Google
2. Gmail sync scans for recruiter/application emails
3. Emails are parsed into applications
4. Applications populate a Kanban pipeline
5. User reviews statuses and next actions
6. User manually updates or enriches applications
7. InterviewerOS continuously becomes the user's job search command center

If only one feature works, it should be: Gmail sync → automatic pipeline generation.

## Core Modules

### 1. Gmail Sync & Email Intelligence (MVP Core)

The Gmail module connects to the user's personal Gmail account and automatically finds recruiter outreach, interview invites, follow-ups, rejection emails, and application confirmations.

**Requirements:**
- Secure Google OAuth login, Gmail readonly access only
- Inbox + Spam + Trash scanning
- Group emails by company/application, deduplicate imported emails
- Parse: company, role, recruiter, stage, timestamps
- Allow manual re-sync
- Never store Google access tokens

**Non-Goals:** No sending emails, no auto-applying, no Gmail write actions, no background auto-syncing initially.

### 2. Application Tracking

Users can manually add applications, edit stages, add notes, move applications between columns, track application dates, and attach resume references.

**Pipeline Stages:** Applied → Phone Screen → Interview → Offer → Rejected

### 3. Resume Tracking (Planned)

Upload resumes, track which resume was used, resume versioning, and resume-to-job matching.

**Future:** Resume scoring, optimization suggestions, AI feedback.

### 4. Interview Prep (Planned)

Interview notes, prep checklist, question bank, company-specific prep.

### 5. Company Research (Future)

Company summaries, funding/news, hiring trends, interview insights.

### 6. AI Recommendations (Future)

Follow up reminders, stale application warnings, interview preparation suggestions, recruiter response summaries.

## Interactive UI

The UI should resemble Linear, Notion, Cursor, and Vercel — workflow-oriented and modern. Avoid cluttered enterprise dashboards, excessive colors, or overly dense tables.

**Planned UI features:**
- Drag-and-drop pipeline (dnd-kit)
- Application detail drawer (right-side slide-in)
- Company logos with initials fallback
- Smart status indicators
- Activity timeline
- Email preview integration
- Dashboard metrics strip
- Search & filters (company, stage, stale, recently updated)
- Improved empty states

## Parser Improvements

**Problem:** Many parsed applications show "Unknown Role" / "Unknown Company", reducing confidence.

**Goal:** Improve parsing quality using deterministic regex — no LLM calls.

**Parser pipeline (staged):**
1. Subject parsing (highest signal)
2. Domain parsing
3. Body parsing
4. Signature parsing
5. Stage classification
6. Per-field confidence scoring (high / medium / low)

**Company detection:** Infer from sender domain, recruiter signature, subject line, scheduling tools. Normalize by removing "jobs"/"careers" prefixes and legal suffixes.

**Role detection:** Extract from subject, body, recruiter signatures, interview scheduling text.

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Express |
| Database | Supabase Postgres |
| Auth | Supabase Auth + Google OAuth |
| Testing | Playwright |

## Architecture Principles

- Plain JavaScript only, minimal dependencies
- No LLM calls initially — lightweight deterministic parsing
- Modular backend design, reusable frontend components

## Non-Goals

InterviewerOS is NOT a LinkedIn clone, ATS platform, autonomous job-application bot, recruiter CRM, or resume builder initially.

## Success Metrics

- Users successfully connect Gmail
- Pipeline auto-populates correctly
- Users return to monitor applications
- Reduced manual tracking effort
- Improved recruiter follow-up consistency

## MVP Definition

The MVP is successful if a user can:
1. Sign in with Google
2. Sync Gmail
3. Automatically generate a job pipeline
4. View recruiter/application statuses
5. Manually manage and update applications
6. Understand what action to take next
