'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { supabase } = require('../supabase');

const router = express.Router();

// -----------------------------------------------------------------------
// GET /api/resumes
// List all resumes for the authenticated user, ordered by created_at DESC
// -----------------------------------------------------------------------
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('resumes')
      .select('id, name, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET /api/resumes db error:', error.message);
      return res.status(500).json({
        error: 'db_error',
        message: 'Could not load resumes.',
      });
    }

    return res.status(200).json({ resumes: data || [] });
  } catch (err) {
    console.error('GET /api/resumes unexpected error:', err.message);
    return res.status(500).json({
      error: 'db_error',
      message: 'Could not load resumes.',
    });
  }
});

// -----------------------------------------------------------------------
// POST /api/resumes
// Create a resume record { name: string (required, 1-200 chars) }
// -----------------------------------------------------------------------
router.post('/', requireAuth, async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'name is required.',
    });
  }
  if (name.trim().length > 200) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'name must be 200 characters or fewer.',
    });
  }

  try {
    const { data, error } = await supabase
      .from('resumes')
      .insert({ user_id: req.user.id, name: name.trim() })
      .select('id, name, created_at')
      .single();

    if (error) {
      console.error('POST /api/resumes db error:', error.message);
      return res.status(500).json({
        error: 'db_error',
        message: 'Could not create resume.',
      });
    }

    return res.status(201).json({ resume: data });
  } catch (err) {
    console.error('POST /api/resumes unexpected error:', err.message);
    return res.status(500).json({
      error: 'db_error',
      message: 'Could not create resume.',
    });
  }
});

// -----------------------------------------------------------------------
// DELETE /api/resumes/:id
// Delete a resume (verify ownership first)
// -----------------------------------------------------------------------
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Check ownership
    const { data: existing, error: fetchErr } = await supabase
      .from('resumes')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Resume not found.',
      });
    }

    const { error } = await supabase
      .from('resumes')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) {
      console.error('DELETE /api/resumes/:id db error:', error.message);
      return res.status(500).json({
        error: 'db_error',
        message: 'Could not delete resume.',
      });
    }

    return res.status(204).send();
  } catch (err) {
    console.error('DELETE /api/resumes/:id unexpected error:', err.message);
    return res.status(500).json({
      error: 'db_error',
      message: 'Could not delete resume.',
    });
  }
});

module.exports = router;
