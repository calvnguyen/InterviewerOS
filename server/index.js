'use strict';

const path = require('path');
const fs = require('fs');

// -- .env resolution --
// 1. Try server/.env (preferred)
// 2. Fall back to project root .env
// 3. If neither exists, exit with a clear error
// Load .env file for local dev; in production (Railway) env vars are injected into process.env directly
const serverEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(serverEnvPath)) {
  require('dotenv').config({ path: serverEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
}

// Validate required env vars
const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`ERROR: ${key} is not set in server/.env.`);
    process.exit(1);
  }
}

const express = require('express');
const cors = require('cors');

const applicationsRouter = require('./routes/applications');
const gmailRouter = require('./routes/gmail');

const app = express();
const PORT = process.env.PORT || 3001;

// -- Middleware --
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  process.env.CLIENT_URL,
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    // allow server-to-server or same-origin requests (no Origin header)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: ${origin} not allowed`))
  },
  credentials: true,
}));
app.use(express.json());

// -- Routes --
app.use('/api/gmail', gmailRouter);
app.use('/api/applications', applicationsRouter);

// -- Health check --
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// -- 404 catch-all --
app.use((req, res, next) => {
  res.status(404).json({ error: 'not_found', message: 'Route not found.' });
});

// -- Global error handler --
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    error: 'internal_error',
    message: 'Something went wrong.',
  });
});

// -- Start server --
app.listen(PORT, () => {
  console.log(`InterviewerOS server listening on port ${PORT}`);
});
