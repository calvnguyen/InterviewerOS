'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { supabase } = require('../supabase');

const router = express.Router();

// -----------------------------------------------------------------------
// GET /api/applications/:id/prep
// Get interview prep for an application (verify ownership first)
// -----------------------------------------------------------------------
router.get('/:id/prep', requireAuth, async (req, res) => {
  try {
    // Verify the user owns the application
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (appErr || !app) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Application not found.',
      });
    }

    const { data, error } = await supabase
      .from('interview_prep')
      .select('id, notes, checklist, created_at, updated_at')
      .eq('application_id', req.params.id)
      .maybeSingle();

    if (error) {
      console.error('GET /api/applications/:id/prep db error:', error.message);
      return res.status(500).json({
        error: 'db_error',
        message: 'Could not load interview prep.',
      });
    }

    return res.status(200).json({ prep: data || null });
  } catch (err) {
    console.error('GET /api/applications/:id/prep unexpected error:', err.message);
    return res.status(500).json({
      error: 'db_error',
      message: 'Could not load interview prep.',
    });
  }
});

// -----------------------------------------------------------------------
// PUT /api/applications/:id/prep
// Upsert interview prep { notes?, checklist? } (verify ownership first)
// -----------------------------------------------------------------------
router.put('/:id/prep', requireAuth, async (req, res) => {
  try {
    // Verify the user owns the application
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (appErr || !app) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Application not found.',
      });
    }

    const { notes, checklist } = req.body;

    const upsertRecord = {
      application_id: req.params.id,
      user_id: req.user.id,
      updated_at: new Date().toISOString(),
    };

    if (notes !== undefined) {
      upsertRecord.notes = notes;
    }
    if (checklist !== undefined) {
      upsertRecord.checklist = checklist;
    }

    const { data, error } = await supabase
      .from('interview_prep')
      .upsert(upsertRecord, { onConflict: 'application_id' })
      .select('id, notes, checklist, updated_at')
      .single();

    if (error) {
      console.error('PUT /api/applications/:id/prep db error:', error.message);
      return res.status(500).json({
        error: 'db_error',
        message: 'Could not save interview prep.',
      });
    }

    return res.status(200).json({ prep: data });
  } catch (err) {
    console.error('PUT /api/applications/:id/prep unexpected error:', err.message);
    return res.status(500).json({
      error: 'db_error',
      message: 'Could not save interview prep.',
    });
  }
});

module.exports = router;
