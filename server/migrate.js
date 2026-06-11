'use strict';

const path = require('path');
const fs = require('fs');

// Load .env from server directory
require('dotenv').config({ path: path.join(__dirname, '.env') });

/**
 * Percent-encode special characters in the password segment of a DATABASE_URL.
 * Supabase sometimes displays passwords wrapped in square brackets, e.g. [$5abc123].
 * The brackets are not part of the password — they are stripped here.
 * All remaining characters that need percent-encoding are encoded.
 */
function fixDatabaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl;

  // Match postgresql://user:PASSWORD@host:port/db or postgresql://user:PASSWORD@host/db
  const match = rawUrl.match(/^(postgres(?:ql)?):\/\/([^:@]+):(.+?)@(.+)$/);
  if (!match) return rawUrl;

  const [, scheme, user, rawPassword, hostAndDb] = match;

  // Strip outer square brackets if present (Supabase dashboard display artifact)
  let password = rawPassword;
  if (password.startsWith('[') && password.endsWith(']')) {
    password = password.slice(1, -1);
  }

  // Percent-encode characters that are not valid in URI userinfo
  const encodedPassword = password
    .split('')
    .map((c) => {
      if (/[^A-Za-z0-9\-._~!$&'()*+,;=]/.test(c) && c !== '%') {
        return encodeURIComponent(c);
      }
      return c;
    })
    .join('');

  return `${scheme}://${user}:${encodedPassword}@${hostAndDb}`;
}

async function migrate() {
  const raw = process.env.DATABASE_URL;

  if (!raw) {
    console.error(
      'ERROR: DATABASE_URL is not set.\n' +
      'Find it at: Supabase Dashboard -> Settings -> Database -> Connection string -> URI.\n' +
      'Use Session mode (port 5432) and copy it into server/.env as DATABASE_URL.\n' +
      'Note: if your password contains special characters (e.g. [ ] $ # @), percent-encode them.'
    );
    process.exit(1);
  }

  const DATABASE_URL = fixDatabaseUrl(raw);

  const { Client } = require('pg');

  // Parse connection details to allow explicit IPv4-only connection attempt
  let clientConfig;
  try {
    const parsed = new URL(DATABASE_URL);
    clientConfig = {
      user: parsed.username,
      password: decodeURIComponent(parsed.password),
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432', 10),
      database: parsed.pathname.replace(/^\//, ''),
      ssl: { rejectUnauthorized: false },
    };
  } catch (e) {
    // Fall back to connection string
    clientConfig = {
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    };
  }

  const client = new Client(clientConfig);

  try {
    await client.connect();
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', '001_initial_schema.sql'),
      'utf8'
    );
    await client.query(sql);
    console.log('Migration complete.');
  } finally {
    await client.end();
  }
}

module.exports = { migrate };

// Run directly if invoked as main
if (require.main === module) {
  migrate().catch((err) => {
    console.error('Migration failed:', err.message);
    console.error(
      '\nIf you see a connection error, check that your DATABASE_URL in server/.env is correct.\n' +
      'Use the Session mode pooler URL (port 5432) from Supabase Dashboard -> Settings -> Database.\n' +
      'If your password contains special characters like [ ] $ # @, percent-encode them first.'
    );
    process.exit(1);
  });
}
