-- Resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resumes_user_idx ON resumes(user_id);

-- Link applications to resumes
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL;

-- Interview prep per application
CREATE TABLE IF NOT EXISTS interview_prep (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL,
  notes          TEXT,
  checklist      JSONB       DEFAULT '[]'::jsonb,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS interview_prep_app_idx ON interview_prep(application_id);
