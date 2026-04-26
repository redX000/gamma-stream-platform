/**
 * @fileoverview One-time Pinterest OAuth2 authorization helper.
 * Run this locally ONCE to exchange your App ID + App Secret for a refresh token.
 * The refresh token is then stored as a GitHub secret (PINTEREST_REFRESH_TOKEN)
 * and is valid for 365 days.
 *
 * Prerequisites:
 *   1. In your Pinterest App settings, add http://localhost:3000/callback as a redirect URI.
 *   2. Set PINTEREST_APP_ID and PINTEREST_APP_SECRET in your .env (or export them).
 *
 * Usage:
 *   node scripts/pinterest-auth.js
 *
 * Output: prints PINTEREST_REFRESH_TOKEN and PINTEREST_BOARD_ID instructions.
 */

import http from 'http';
import { URL } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const APP_ID = process.env.PINTEREST_APP_ID;
const APP_SECRET = process.env.PINTEREST_APP_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';
const SCOPES = 'boards:read,pins:write';
const PORT = 3000;

if (!APP_ID || !APP_SECRET) {
  console.error('Error: PINTEREST_APP_ID and PINTEREST_APP_SECRET must be set in your .env file.');
  process.exit(1);
}

// Build the Pinterest authorization URL
const state = Math.random().toString(36).slice(2);
const authUrl = new URL('https://www.pinterest.com/oauth/');
authUrl.searchParams.set('client_id', APP_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('state', state);

console.log('\n=== Pinterest OAuth2 Setup ===\n');
console.log('STEP 1 — Open this URL in your browser:\n');
console.log(authUrl.toString());
console.log('\nSigning in with your Pinterest account and approving the permissions...');
console.log('\nWaiting for redirect to http://localhost:3000/callback ...\n');

// Start a local server to capture the redirect with the auth code
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname !== '/callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`<h2>Authorization denied: ${error}</h2><p>You can close this tab.</p>`);
    console.error(`\nAuthorization denied: ${error}`);
    server.close();
    process.exit(1);
  }

  if (returnedState !== state) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('<h2>State mismatch — possible CSRF</h2><p>You can close this tab.</p>');
    console.error('\nState mismatch — aborting.');
    server.close();
    process.exit(1);
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h2>Authorization successful!</h2><p>You can close this tab and return to your terminal.</p>');

  server.close();
  await exchangeCodeForTokens(code);
});

server.listen(PORT);

async function exchangeCodeForTokens(code) {
  console.log('\nSTEP 2 — Exchanging authorization code for tokens...\n');

  const { default: fetch } = await import('node-fetch');

  const credentials = Buffer.from(`${APP_ID}:${APP_SECRET}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  });

  const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Token exchange failed ${res.status}: ${err}`);
    process.exit(1);
  }

  const data = await res.json();
  const refreshToken = data.refresh_token;
  const expiresIn = data.refresh_token_expires_in;
  const expiryDays = expiresIn ? Math.round(expiresIn / 86400) : 365;

  // Fetch boards so the user can grab their board ID
  const boardsRes = await fetch('https://api.pinterest.com/v5/boards?page_size=10', {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const boards = boardsRes.ok ? (await boardsRes.json()).items || [] : [];

  console.log('=== SUCCESS ===\n');
  console.log('Add these as GitHub repository secrets:\n');
  console.log(`  PINTEREST_REFRESH_TOKEN = ${refreshToken}`);
  console.log(`  (expires in ~${expiryDays} days — re-run this script before then)\n`);

  if (boards.length) {
    console.log('Your Pinterest boards (pick one for PINTEREST_BOARD_ID):\n');
    boards.forEach((b) => {
      console.log(`  Board: "${b.name}"`);
      console.log(`  ID:    ${b.id}\n`);
    });
    console.log(`  PINTEREST_BOARD_ID = <id from above>\n`);
  } else {
    console.log('Could not fetch boards — set PINTEREST_BOARD_ID manually from pinterest.com/settings/boards\n');
  }

  console.log('How to add GitHub secrets:');
  console.log('  gh secret set PINTEREST_REFRESH_TOKEN --body "<token>"');
  console.log('  gh secret set PINTEREST_BOARD_ID     --body "<board_id>"\n');
}
