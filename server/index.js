'use strict';

const path = require('path');
const fs = require('fs');

// -- .env resolution --
// 1. Try server/.env (preferred)
// 2. Fall back to project root .env
// 3. If neither exists, exit with a clear error
const serverEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(serverEnvPath)) {
  require('dotenv').config({ path: serverEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  // Copy root .env to server/.env and load it
  fs.copyFileSync(rootEnvPath, serverEnvPath);
  require('dotenv').config({ path: serverEnvPath });
} else {
  console.error(
    'ERROR: server/.env is missing. Copy .env.example to server/.env and fill in your Supabase credentials.'
  );
  process.exit(1);
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
app.use(cors({
  origin: 'http://localhost:5173',
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
  console.log(`InterviewOS server listening on port ${PORT}`);
});
