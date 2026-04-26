/**
 * @fileoverview One-time local OAuth2 flow to obtain a YouTube refresh token.
 *
 * Run ONCE locally:
 *   node scripts/youtube-auth.js
 *
 * Prerequisites — add to .env first:
 *   YOUTUBE_CLIENT_ID=...
 *   YOUTUBE_CLIENT_SECRET=...
 *
 * After running, add to GitHub Secrets (Settings → Secrets → Actions):
 *   YOUTUBE_CLIENT_ID
 *   YOUTUBE_CLIENT_SECRET
 *   YOUTUBE_REFRESH_TOKEN   ← printed at the end of this script
 */

import { google } from 'googleapis';
import readline from 'readline';
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

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
];

// 'urn:ietf:wg:oauth:2.0:oob' is the out-of-band redirect for Desktop app credentials.
// Google shows the auth code on screen instead of redirecting to a URL.
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, 'urn:ietf:wg:oauth:2.0:oob');

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',   // required to receive a refresh token
  scope: SCOPES,
  prompt: 'consent',        // force consent screen so refresh_token is always returned
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  YouTube OAuth Setup — Gamma Stream Platform');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('Step 1: Open this URL in your browser (use the channel owner account):\n');
console.log(`  ${authUrl}\n`);
console.log('Step 2: Sign in, click Allow, then copy the code shown.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Step 3: Paste the authorization code here: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());

    if (!tokens.refresh_token) {
      console.error('\n❌  No refresh_token returned.');
      console.error('    This happens if you already authorized this app before.');
      console.error('    Fix: go to https://myaccount.google.com/permissions, revoke');
      console.error('    "Gamma Stream", then run this script again.\n');
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
      console.error('    Code expired (codes are single-use and expire quickly). Run the script again.\n');
    }
    process.exit(1);
  }
});
