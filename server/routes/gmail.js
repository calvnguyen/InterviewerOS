'use strict';

const express = require('express');
const { google } = require('googleapis');
const { requireAuth } = require('../middleware/auth');
const { supabase } = require('../supabase');
const { computeFields } = require('../lib/computeFields');
const parseEmail = require('../lib/parseEmail');

const router = express.Router();

const GENERIC_SENDER_DOMAINS = new Set([
  'gmail', 'yahoo', 'hotmail', 'outlook', 'icloud', 'noreply', 'no-reply',
  'notifications', 'mail', 'email', 'info', 'support', 'hello', 'team',
]);

function extractCompanyFromSender(from) {
  if (!from) return null;

  // "Waymo Recruiting <jobs@waymo.com>" → try display name first
  const displayMatch = from.match(/^"?(.+?)"?\s*</);
  if (displayMatch) {
    const name = displayMatch[1]
      .replace(/\s+(careers|recruiting|talent|hr|hiring|jobs|team|no.?reply|notifications?)$/i, '')
      .trim();
    if (name && name.length > 1) return name;
  }

  // Fallback: use subdomain/domain of email address
  const emailMatch = from.match(/@([^.>@]+)/);
  if (emailMatch) {
    const domain = emailMatch[1].toLowerCase();
    if (!GENERIC_SENDER_DOMAINS.has(domain)) {
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
  }

  return null;
}

function sanitizeApplication(record) {
  const { user_id, ...rest } = record;
  return rest;
}

function formatApplication(record) {
  return sanitizeApplication(computeFields(record));
}

// -----------------------------------------------------------------------
// POST /api/gmail/sync
// Accepts a Google access token from the Supabase session (provider_token),
// scans Gmail for job-related emails, imports new applications.
// The token is used only for this request and is never stored or logged.
// -----------------------------------------------------------------------
router.post('/sync', requireAuth, async (req, res) => {
  const { google_token } = req.body;

  if (!google_token || typeof google_token !== 'string' || !google_token.trim()) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'google_token is required.',
    });
  }

  // Set up Gmail API client using the provided access token — never stored
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: google_token });
  const gmail = google.gmail({ version: 'v1', auth });

  // Fetch matching messages
  let messageList;
  try {
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: 'subject:application OR subject:interview OR subject:offer OR subject:hired OR subject:rejected OR "thank you for applying" OR "your application" OR "interview invitation"',
      maxResults: 100,
      includeSpamTrash: true,
    });
    messageList = listResponse.data.messages || [];
  } catch (gmailErr) {
    console.error('Gmail API list error:', gmailErr.message);
    return res.status(503).json({
      error: 'gmail_sync_failed',
      message: 'Gmail sync failed. Try again.',
    });
  }

  // Fetch existing gmail_message_ids for this user to enable deduplication
  const { data: existingRows } = await supabase
    .from('applications')
    .select('gmail_message_id')
    .eq('user_id', req.user.id)
    .not('gmail_message_id', 'is', null);

  const existingMessageIds = new Set(
    (existingRows || []).map((r) => r.gmail_message_id)
  );

  let imported = 0;
  let skipped = 0;
  const importedApplications = [];

  for (const msg of messageList) {
    if (existingMessageIds.has(msg.id)) {
      skipped++;
      continue;
    }

    // Fetch message details (metadata only — no full body)
    let messageData;
    try {
      const getResponse = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      });
      messageData = getResponse.data;
    } catch (getErr) {
      console.warn(`Could not fetch message ${msg.id}:`, getErr.message);
      skipped++;
      continue;
    }

    const headers = (messageData.payload && messageData.payload.headers) || [];
    const subject = (headers.find((h) => h.name === 'Subject') || {}).value || '';
    const from = (headers.find((h) => h.name === 'From') || {}).value || '';
    const snippet = messageData.snippet || '';
    const internalDate = messageData.internalDate
      ? new Date(parseInt(messageData.internalDate, 10)).toISOString()
      : new Date().toISOString();

    // Parse using structured input — subject gets highest-confidence treatment
    const parsed = parseEmail({ subject, body: snippet, from });

    // Skip messages with no useful content
    if (!parsed.company && !parsed.role && !parsed.stage) {
      skipped++;
      continue;
    }

    // Derive company from From header when regex parsing misses it
    const company = parsed.company || extractCompanyFromSender(from) || 'Unknown Company';

    const record = {
      user_id: req.user.id,
      company,
      role: parsed.role || 'Unknown Role',
      stage: parsed.stage || 'applied',
      date_applied: internalDate.slice(0, 10),
      notes: null,
      gmail_message_id: msg.id,
    };

    try {
      const { data: created, error: insertErr } = await supabase
        .from('applications')
        .insert(record)
        .select()
        .single();

      if (insertErr) {
        console.warn(`Insert skipped for message ${msg.id}:`, insertErr.message);
        skipped++;
        continue;
      }

      imported++;
      importedApplications.push(formatApplication(created));
    } catch (insertCatchErr) {
      console.warn(`Insert error for message ${msg.id}:`, insertCatchErr.message);
      skipped++;
    }
  }

  // Update last_synced_at in user_meta
  const lastSyncedAt = new Date().toISOString();
  await supabase
    .from('user_meta')
    .upsert(
      { user_id: req.user.id, last_synced_at: lastSyncedAt, updated_at: lastSyncedAt },
      { onConflict: 'user_id' }
    );

  return res.status(200).json({
    imported,
    skipped,
    last_synced_at: lastSyncedAt,
    applications: importedApplications,
  });
});

// -----------------------------------------------------------------------
// GET /api/gmail/last-synced
// Returns the last Gmail sync timestamp for the current user.
// -----------------------------------------------------------------------
router.get('/last-synced', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_meta')
      .select('last_synced_at')
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(200).json({ last_synced_at: null });
    }

    return res.status(200).json({ last_synced_at: data.last_synced_at || null });
  } catch (err) {
    console.error('GET /api/gmail/last-synced unexpected error:', err.message);
    return res.status(200).json({ last_synced_at: null });
  }
});

module.exports = router;
