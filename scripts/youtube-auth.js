/**
 * @fileoverview One-time local OAuth2 flow to obtain a YouTube refresh token.
 *
 * Run ONCE locally:
 *   node scripts/youtube-auth.js
 *
 * Prerequisites:
 *   1. Add to .env:  YOUTUBE_CLIENT_ID=...  YOUTUBE_CLIENT_SECRET=...
 *   2. In Google Cloud Console → APIs & Services → Credentials → edit your
 *      Desktop app OAuth client → add  http://localhost:8080  as an
 *      authorized redirect URI and save.
 *
 * After running, add to GitHub Secrets (Settings → Secrets → Actions):
 *   YOUTUBE_CLIENT_ID
 *   YOUTUBE_CLIENT_SECRET
 *   YOUTUBE_REFRESH_TOKEN   ← printed at the end of this script
 *
 * Note: urn:ietf:wg:oauth:2.0:oob (OOB flow) was deprecated by Google in
 * 2022 and now causes invalid_client. This script uses localhost redirect
 * instead, which is the correct approach for new Desktop app clients.
 */

import { google } from 'googleapis';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌  YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET must be in .env');
  console.error('    Get them from: console.cloud.google.com → APIs & Services → Credentials\n');
  process.exit(1);
}

const PORT = 8080;
const REDIRECT_URI = `http://localhost:${PORT}`;

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
];

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  YouTube OAuth Setup — Gamma Stream Platform');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('Prerequisite check:');
console.log('  Make sure http://localhost:8080 is listed as an authorized redirect URI');
console.log('  on your OAuth client in Google Cloud Console, then press Enter.\n');
console.log('Open this URL in your browser (use the channel owner account):\n');
console.log(`  ${authUrl}\n`);
console.log('Waiting for Google to redirect back to localhost:8080…\n');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);

  const error = url.searchParams.get('error');
  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`<h2>❌ Auth error: ${error}</h2><p>Check the terminal.</p>`);
    server.close();
    console.error(`\n❌  Google returned an error: ${error}\n`);
    process.exit(1);
  }

  const code = url.searchParams.get('code');
  if (!code) {
    // Ignore favicon or other stray requests.
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h2>✅ Authorized! You can close this tab and check your terminal.</h2>');
  server.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.error('\n❌  No refresh_token returned.');
      console.error('    This happens when the app was already authorized before.');
      console.error('    Fix: go to https://myaccount.google.com/permissions, revoke');
      console.error('    access for your app ("Gamma Stream"), then run this script again.\n');
      process.exit(1);
    }

    console.log('\n✅  Success! Add these three secrets to GitHub:\n');
    console.log('    Settings → Secrets and variables → Actions → New repository secret\n');
    console.log(`    YOUTUBE_CLIENT_ID     = ${CLIENT_ID}`);
    console.log(`    YOUTUBE_CLIENT_SECRET = ${CLIENT_SECRET}`);
    console.log(`    YOUTUBE_REFRESH_TOKEN = ${tokens.refresh_token}`);
    console.log('\n⚠️   Never commit the refresh token to git.\n');
    console.log('    Token type: Desktop app (long-lived, does not expire unless revoked)');
    console.log('    Scope: youtube.upload + youtube (read channel info)\n');
  } catch (err) {
    console.error('\n❌  Token exchange failed:', err.message);
    if (err.message.includes('invalid_grant')) {
      console.error('    Auth code expired or already used. Run the script again and');
      console.error('    complete the browser step quickly (codes expire in ~1 minute).\n');
    }
    process.exit(1);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  // Server is ready — URL was already printed above.
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} is already in use. Close whatever is using it and try again.\n`);
  } else {
    console.error('\n❌  Server error:', err.message);
  }
  process.exit(1);
});
