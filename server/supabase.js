'use strict';

const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error(
    'ERROR: SUPABASE_URL and SUPABASE_SECRET_KEY must be set in server/.env.'
  );
  process.exit(1);
}

// Service-role client — bypasses RLS. Safe here because the server validates
// the user JWT itself via requireAuth middleware before touching the database.
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = { supabase };
