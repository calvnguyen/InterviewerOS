'use strict';

const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    'ERROR: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set in server/.env.'
  );
  process.exit(1);
}

// Publishable-key client — used by route handlers, respects RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

module.exports = { supabase };
