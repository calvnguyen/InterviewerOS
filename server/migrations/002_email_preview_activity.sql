-- Add email preview columns to applications
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS email_subject TEXT,
  ADD COLUMN IF NOT EXISTS email_snippet TEXT;

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  application_id UUID     NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_app_idx ON activity_log(application_id, created_at DESC);
