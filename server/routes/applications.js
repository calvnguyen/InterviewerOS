'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { supabase } = require('../supabase');
const { computeFields } = require('../lib/computeFields');
const parseEmail = require('../lib/parseEmail');

const router = express.Router();

const VALID_STAGES = ['applied', 'phone_screen', 'interview', 'offer', 'rejected'];

// Helper: strip user_id from a record before sending to client
function sanitize(record) {
  const { user_id, ...rest } = record;
  return rest;
}

// Helper: apply computeFields and sanitize
function formatApplication(record) {
  return sanitize(computeFields(record));
}

// -----------------------------------------------------------------------
// POST /api/applications/parse-email
// Must come BEFORE /:id routes so Express doesn't treat "parse-email" as an ID
// -----------------------------------------------------------------------
router.post('/parse-email', requireAuth, (req, res) => {
  const { email_text } = req.body;

  if (!email_text || typeof email_text !== 'string' || !email_text.trim()) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'email_text is required.',
    });
  }

  try {
    const result = parseEmail(email_text);
    return res.status(200).json({
      company: result.company,
      company_confidence: result.company_confidence,
      role: result.role,
      role_confidence: result.role_confidence,
      stage: result.stage,
      stage_confidence: result.stage_confidence,
      confidence: result.confidence,
    });
  } catch (err) {
    // Never 5xx for parsing errors — return low-confidence empty result
    return res.status(200).json({
      company: null,
      company_confidence: 'low',
      role: null,
      role_confidence: 'low',
      stage: null,
      stage_confidence: 'low',
      confidence: 'low',
    });
  }
});

// -----------------------------------------------------------------------
// GET /api/applications
// -----------------------------------------------------------------------
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET /api/applications db error:', error.message);
      return res.status(500).json({
        error: 'db_error',
        message: 'Could not load applications.',
      });
    }

    return res.status(200).json({
      applications: (data || []).map(formatApplication),
    });
  } catch (err) {
    console.error('GET /api/applications unexpected error:', err.message);
    return res.status(500).json({
      error: 'db_error',
      message: 'Could not load applications.',
    });
  }
});

// -----------------------------------------------------------------------
// GET /api/applications/:id/activity
// Must be registered BEFORE /:id so Express does not swallow "activity"
// as a dynamic segment value.
// -----------------------------------------------------------------------
router.get('/:id/activity', requireAuth, async (req, res) => {
  try {
    // Verify ownership of the application
    const { data: existing, error: fetchErr } = await supabase
      .from('applications')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Application not found.',
      });
    }

    const { data, error } = await supabase
      .from('activity_log')
      .select('id, action, metadata, created_at')
      .eq('application_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('GET /api/applications/:id/activity db error:', error.message);
      return res.status(500).json({
        error: 'db_error',
        message: 'Could not load activity.',
      });
    }

    return res.status(200).json({ activity: data || [] });
  } catch (err) {
    console.error('GET /api/applications/:id/activity unexpected error:', err.message);
    return res.status(500).json({
      error: 'db_error',
      message: 'Could not load activity.',
    });
  }
});

// -----------------------------------------------------------------------
// GET /api/applications/:id
// -----------------------------------------------------------------------
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Application not found.',
      });
    }

    return res.status(200).json({ application: formatApplication(data) });
  } catch (err) {
    console.error('GET /api/applications/:id unexpected error:', err.message);
    return res.status(500).json({
      error: 'db_error',
      message: 'Could not load applications.',
    });
  }
});

// -----------------------------------------------------------------------
// POST /api/applications
// -----------------------------------------------------------------------
router.post('/', requireAuth, async (req, res) => {
  const { company, role, stage, date_applied, notes } = req.body;

  // Validation
  if (!company || typeof company !== 'string' || !company.trim()) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'company is required.',
    });
  }
  if (company.trim().length > 200) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'company must be 200 characters or fewer.',
    });
  }

  if (!role || typeof role !== 'string' || !role.trim()) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'role is required.',
    });
  }
  if (role.trim().length > 200) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'role must be 200 characters or fewer.',
    });
  }

  if (stage !== undefined && !VALID_STAGES.includes(stage)) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'stage must be one of: applied, phone_screen, interview, offer, rejected.',
    });
  }

  if (date_applied !== undefined && isNaN(Date.parse(date_applied))) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'date_applied must be a valid ISO 8601 date.',
    });
  }

  if (notes !== undefined && typeof notes === 'string' && notes.length > 2000) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'notes must be 2000 characters or fewer.',
    });
  }

  const record = {
    user_id: req.user.id,
    company: company.trim(),
    role: role.trim(),
    stage: stage || 'applied',
    date_applied: date_applied || new Date().toISOString().slice(0, 10),
    notes: notes || null,
  };

  try {
    const { data, error } = await supabase
      .from('applications')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('POST /api/applications db error:', error.message);
      return res.status(500).json({
        error: 'db_error',
        message: 'Could not save application.',
      });
    }

    // Log created activity (best-effort — don't block response on failure)
    ;(async () => {
      const { error: logErr } = await supabase.from('activity_log').insert({
        user_id: req.user.id,
        application_id: data.id,
        action: 'created',
        metadata: { source: 'manual' },
      });
      if (logErr) console.warn('Activity log insert failed (POST /api/applications):', logErr.message);
    })();

    return res.status(201).json({ application: formatApplication(data) });
  } catch (err) {
    console.error('POST /api/applications unexpected error:', err.message);
    return res.status(500).json({
      error: 'db_error',
      message: 'Could not save application.',
    });
  }
});

// -----------------------------------------------------------------------
// PUT /api/applications/:id
// -----------------------------------------------------------------------
router.put('/:id', requireAuth, async (req, res) => {
  // Fetch existing record to check ownership and detect changes for activity log
  let existing;
  try {
    const { data: existingData, error: fetchErr } = await supabase
      .from('applications')
      .select('stage, notes')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchErr || !existingData) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Application not found.',
      });
    }
    existing = existingData;
  } catch (err) {
    console.error('PUT /api/applications/:id ownership check error:', err.message);
    return res.status(500).json({
      error: 'db_error',
      message: 'Could not update application.',
    });
  }

  const { company, role, stage, date_applied, notes, resume_id } = req.body;
  const updates = {};

  if (company !== undefined) {
    if (typeof company !== 'string' || !company.trim()) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'company is required.',
      });
    }
    if (company.trim().length > 200) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'company must be 200 characters or fewer.',
      });
    }
    updates.company = company.trim();
  }

  if (role !== undefined) {
    if (typeof role !== 'string' || !role.trim()) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'role is required.',
      });
    }
    if (role.trim().length > 200) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'role must be 200 characters or fewer.',
      });
    }
    updates.role = role.trim();
  }

  if (stage !== undefined) {
    if (!VALID_STAGES.includes(stage)) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'stage must be one of: applied, phone_screen, interview, offer, rejected.',
      });
    }
    updates.stage = stage;
  }

  if (date_applied !== undefined) {
    if (isNaN(Date.parse(date_applied))) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'date_applied must be a valid ISO 8601 date.',
      });
    }
    updates.date_applied = date_applied;
  }

  if (notes !== undefined) {
    if (typeof notes === 'string' && notes.length > 2000) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'notes must be 2000 characters or fewer.',
      });
    }
    updates.notes = notes;
  }

  // resume_id may be a UUID string or null (to clear)
  if (resume_id !== undefined) {
    updates.resume_id = resume_id || null;
  }

  updates.updated_at = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('PUT /api/applications/:id db error:', error.message);
      return res.status(500).json({
        error: 'db_error',
        message: 'Could not update application.',
      });
    }

    // Determine what changed and log appropriate activity (best-effort)
    const { stage: reqStage, notes: reqNotes } = req.body;
    let activityAction = 'updated';
    let activityMetadata = {};

    if (reqStage !== undefined && reqStage !== existing.stage) {
      activityAction = 'stage_changed';
      activityMetadata = { from_stage: existing.stage, to_stage: reqStage };
    } else if (reqNotes !== undefined && reqNotes !== existing.notes) {
      activityAction = 'notes_updated';
    }

    ;(async () => {
      const { error: logErr } = await supabase.from('activity_log').insert({
        user_id: req.user.id,
        application_id: req.params.id,
        action: activityAction,
        metadata: activityMetadata,
      });
      if (logErr) console.warn('Activity log insert failed (PUT /api/applications/:id):', logErr.message);
    })();

    return res.status(200).json({ application: formatApplication(data) });
  } catch (err) {
    console.error('PUT /api/applications/:id unexpected error:', err.message);
    return res.status(500).json({
      error: 'db_error',
      message: 'Could not update application.',
    });
  }
});

// -----------------------------------------------------------------------
// DELETE /api/applications/:id
// -----------------------------------------------------------------------
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Check ownership first
    const { data: existing, error: fetchErr } = await supabase
      .from('applications')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Application not found.',
      });
    }

    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) {
      console.error('DELETE /api/applications/:id db error:', error.message);
      return res.status(500).json({
        error: 'db_error',
        message: 'Could not delete application.',
      });
    }

    return res.status(204).send();
  } catch (err) {
    console.error('DELETE /api/applications/:id unexpected error:', err.message);
    return res.status(500).json({
      error: 'db_error',
      message: 'Could not delete application.',
    });
  }
});

module.exports = router;
