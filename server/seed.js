'use strict';

const path = require('path');
const fs = require('fs');

// -- .env resolution --
const serverEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(serverEnvPath)) {
  require('dotenv').config({ path: serverEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  fs.copyFileSync(rootEnvPath, serverEnvPath);
  require('dotenv').config({ path: serverEnvPath });
} else {
  console.error(
    'ERROR: server/.env is missing. Copy .env.example to server/.env and fill in your Supabase credentials.'
  );
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const { migrate } = require('./migrate');

const DEMO_EMAIL = 'demo@interviewos.app';
const DEMO_PASSWORD = 'Demo1234!';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function dateOnly(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// 8 realistic demo applications spread across all 5 stages.
// created_at/updated_at are varied so stale indicators activate on some cards.
const DEMO_APPLICATIONS = [
  {
    company: 'Stripe',
    role: 'Product Manager, Payments',
    stage: 'applied',
    date_applied: dateOnly(2),
    notes: 'Applied via Stripe careers page. Referred by a former colleague.',
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
  {
    company: 'Notion',
    role: 'Senior Product Designer',
    stage: 'applied',
    date_applied: dateOnly(10),
    notes: 'Found on LinkedIn. Tailored resume for their design-systems role.',
    created_at: daysAgo(10),
    updated_at: daysAgo(10), // stale: 10 days no update
  },
  {
    company: 'Linear',
    role: 'Product Engineer',
    stage: 'phone_screen',
    date_applied: dateOnly(14),
    notes: 'Recruiter reached out directly. Phone screen scheduled for next week.',
    created_at: daysAgo(14),
    updated_at: daysAgo(8), // stale: 8 days since stage moved
  },
  {
    company: 'Figma',
    role: 'Staff Product Manager',
    stage: 'interview',
    date_applied: dateOnly(21),
    notes: 'Passed phone screen. Panel interview with PM and Eng leads.',
    created_at: daysAgo(21),
    updated_at: daysAgo(3), // not stale
  },
  {
    company: 'Vercel',
    role: 'Developer Advocate',
    stage: 'interview',
    date_applied: dateOnly(18),
    notes: 'Technical interview round. Preparing a demo of open-source project.',
    created_at: daysAgo(18),
    updated_at: daysAgo(9), // stale: 9 days since interview scheduled
  },
  {
    company: 'Loom',
    role: 'Growth Product Manager',
    stage: 'offer',
    date_applied: dateOnly(30),
    notes: 'Offer received. Reviewing compensation package. Need to respond by Friday.',
    created_at: daysAgo(30),
    updated_at: daysAgo(2), // not stale (offer/rejected never stale)
  },
  {
    company: 'Anthropic',
    role: 'Technical Program Manager',
    stage: 'rejected',
    date_applied: dateOnly(25),
    notes: 'Received rejection. Role was filled internally. Good conversation with team.',
    created_at: daysAgo(25),
    updated_at: daysAgo(5),
  },
  {
    company: 'Ramp',
    role: 'Product Manager, Growth',
    stage: 'applied',
    date_applied: dateOnly(1),
    notes: null,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
];

async function seed() {
  // Step 1: run migrations — skip gracefully if DB is unreachable (tables may already exist via Supabase MCP)
  console.log('Running migrations...');
  try {
    await migrate();
  } catch (err) {
    console.log(`Migration skipped (${err.message.slice(0, 60)}). Assuming tables already exist.`);
  }

  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SECRET_KEY must be set in server/.env.');
    process.exit(1);
  }

  // Admin client — uses service role key, never exposed to clients
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Step 2: idempotent user creation
  console.log('Creating demo user...');
  let userId;

  const { data: existingUsers, error: listErr } = await adminClient.auth.admin.listUsers();
  if (listErr) {
    console.error('Could not list users:', listErr.message);
    process.exit(1);
  }

  const existing = (existingUsers.users || []).find((u) => u.email === DEMO_EMAIL);

  if (existing) {
    userId = existing.id;
    console.log(`Demo user already exists (id: ${userId}). Reusing.`);
  } else {
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });

    if (createErr) {
      console.error('Could not create demo user:', createErr.message);
      process.exit(1);
    }

    userId = created.user.id;
    console.log(`Demo user created (id: ${userId}).`);
  }

  // Step 3: delete existing seed applications for this user (idempotent)
  const { error: deleteErr } = await adminClient
    .from('applications')
    .delete()
    .eq('user_id', userId);

  if (deleteErr) {
    console.error('Could not clear existing seed applications:', deleteErr.message);
    process.exit(1);
  }

  // Also clear user_meta for this user
  await adminClient.from('user_meta').delete().eq('user_id', userId);

  // Step 4: insert demo applications with realistic timestamps
  console.log('Inserting demo applications...');
  const records = DEMO_APPLICATIONS.map((app) => ({
    ...app,
    user_id: userId,
  }));

  const { error: insertErr } = await adminClient.from('applications').insert(records);

  if (insertErr) {
    console.error('Could not insert demo applications:', insertErr.message);
    process.exit(1);
  }

  console.log(`\nSeed complete. ${records.length} applications inserted.`);
  console.log(`\nDemo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
