'use strict';

const { createRemoteJWKSet, jwtVerify } = require('jose');

let JWKS;

function getJWKS() {
  if (!JWKS) {
    const { SUPABASE_URL } = process.env;
    if (!SUPABASE_URL) {
      throw new Error('SUPABASE_URL is not set.');
    }
    // Use the .well-known/jwks.json path — /auth/v1/jwks returns 404 on many Supabase projects
    const jwksUrl = new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
    JWKS = createRemoteJWKSet(jwksUrl);
  }
  return JWKS;
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired token.',
    });
  }

  const token = authHeader.slice(7);

  try {
    const jwks = getJWKS();
    const { payload } = await jwtVerify(token, jwks, {
      algorithms: ['RS256', 'ES256'],
    });

    req.user = { id: payload.sub };
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired token.',
    });
  }
}

module.exports = { requireAuth };
