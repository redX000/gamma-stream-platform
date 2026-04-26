/**
 * @fileoverview Automated YouTube publisher for Gamma Stream Platform.
 *
 * Reads assembled MP4s from videos/output/, matches them to script JSON for
 * metadata, uploads via YouTube Data API v3, and schedules publication.
 *
 * Scheduling:
 *   Long-form  → next available 14:00 UTC (2pm)
 *   Shorts     → next available 18:00 UTC (6pm)
 *
 * Quota: videos.insert costs 1,600 units (~6 uploads/day on free 10K/day tier).
 *
 * Usage:
 *   node automation/youtube-publisher.js
 *   node automation/youtube-publisher.js --topic best-ai-tools
 *   node automation/youtube-publisher.js --type short
 *   node automation/youtube-publisher.js --type long
 *
 * Required env vars (GitHub Secrets or .env):
 *   YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN
 *
 * Run scripts/youtube-auth.js once locally to obtain the refresh token.
 */

import { google } from 'googleapis';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

dotenv.config({ path: path.join(ROOT, '.env') });

// ── Paths ──────────────────────────────────────────────────────────────────────

const OUTPUT_DIR = path.join(ROOT, 'videos', 'output');
const SCRIPTS_DIR = path.join(ROOT, 'videos', 'scripts');
const UPLOADS_FILE = path.join(ROOT, 'videos', 'uploads.json');

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORY_ID = '28'; // Science & Technology
const LONG_PUBLISH_HOUR_UTC = 14;  // 2 pm UTC
const SHORT_PUBLISH_HOUR_UTC = 18; // 6 pm UTC

// Shared affiliate footer appended to every description.
// Replace URLs with your actual affiliate tracking links from your platform.
const AFFILIATE_FOOTER = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 TOOLS MENTIONED — affiliate links (no extra cost to you):

• Jasper AI (long-form writing):  https://jasper.ai
• Surfer SEO (content ranking):   https://surferseo.com
• Zapier (workflow automation):   https://zapier.com
• Canva AI (design in seconds):   https://canva.com
• Copy.ai (AI copywriting):       https://copy.ai
• Systeme.io (all-in-one funnel): https://systeme.io

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📩 Subscribe for weekly AI tool reviews & productivity tips!
👍 Like if this saved you time.`;

// ── Auth ───────────────────────────────────────────────────────────────────────

function buildOAuthClient() {
  const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
    throw new Error(
      'Missing credentials. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and ' +
      'YOUTUBE_REFRESH_TOKEN in .env or GitHub Secrets.\n' +
      'Run scripts/youtube-auth.js once to obtain a refresh token.'
    );
  }
  const auth = new google.auth.OAuth2(YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: YOUTUBE_REFRESH_TOKEN });
  return auth;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Convert a kebab-case slug to Title Case.
 * 'best-ai-tools' → 'Best AI Tools'
 */
function slugToTitle(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Returns the next ISO 8601 timestamp at `hourUTC:00:00Z`.
 * If today's slot has already passed, returns tomorrow's.
 */
function nextPublishTime(hourUTC) {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setUTCHours(hourUTC, 0, 0, 0);
  if (candidate <= now) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return candidate.toISOString();
}

async function loadUploads() {
  try {
    return JSON.parse(await fs.readFile(UPLOADS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

async function saveUploads(uploads) {
  await fs.mkdir(path.dirname(UPLOADS_FILE), { recursive: true });
  await fs.writeFile(UPLOADS_FILE, JSON.stringify(uploads, null, 2));
}

async function readScript(date, topic) {
  try {
    return JSON.parse(
      await fs.readFile(path.join(SCRIPTS_DIR, `${date}-${topic}.json`), 'utf8')
    );
  } catch {
    return null;
  }
}

// ── Metadata builders ──────────────────────────────────────────────────────────

function buildShortMetadata(script) {
  const baseTitle = slugToTitle(script.topic);
  const title = `${baseTitle} (60-Second Guide) #Shorts`;

  // First 200 chars of short script + hashtags
  const excerpt = (script.shortScript ?? '').slice(0, 200).trimEnd();
  const description = `${excerpt}\n\n#Shorts #AITools #Productivity #Tech${AFFILIATE_FOOTER}`;

  const tags = [
    ...(script.keywords ?? '').split(' ').filter(Boolean),
    'AI tools', 'artificial intelligence', 'productivity', 'technology', 'Shorts', 'YouTube Shorts', '2026',
  ];

  return {
    snippet: {
      title,
      description,
      tags,
      categoryId: CATEGORY_ID,
      defaultLanguage: 'en',
    },
    status: {
      privacyStatus: 'private',
      publishAt: nextPublishTime(SHORT_PUBLISH_HOUR_UTC),
      selfDeclaredMadeForKids: false,
    },
  };
}

function buildLongMetadata(script) {
  const baseTitle = slugToTitle(script.topic);
  const title = `${baseTitle} — Complete Guide 2026`;

  // First 400 chars of long script as description opener
  const excerpt = (script.longScript ?? '').slice(0, 400).trimEnd();
  const description = `${excerpt}\n\n${AFFILIATE_FOOTER}`;

  const tags = [
    ...(script.keywords ?? '').split(' ').filter(Boolean),
    'AI tools', 'artificial intelligence', 'best AI tools', 'productivity', 'tech review', '2026',
  ];

  return {
    snippet: {
      title,
      description,
      tags,
      categoryId: CATEGORY_ID,
      defaultLanguage: 'en',
    },
    status: {
      privacyStatus: 'private',
      publishAt: nextPublishTime(LONG_PUBLISH_HOUR_UTC),
      selfDeclaredMadeForKids: false,
    },
  };
}

function buildMetadata(script, type) {
  return type === 'short' ? buildShortMetadata(script) : buildLongMetadata(script);
}

// ── Upload ─────────────────────────────────────────────────────────────────────

async function uploadVideo(youtube, videoPath, metadata) {
  const stat = await fs.stat(videoPath);
  const sizeMb = (stat.size / 1024 / 1024).toFixed(1);
  console.log(`  Uploading ${path.basename(videoPath)} (${sizeMb} MB)…`);

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: metadata,
    media: { body: createReadStream(videoPath) },
  });

  return res.data;
}

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * Upload all unprocessed MP4s from videos/output/ to YouTube.
 *
 * @param {object} [filter]
 * @param {string|null} [filter.topic]  Only process this topic slug.
 * @param {string|null} [filter.type]   'short' | 'long' | null (both).
 * @returns {Promise<Array>} Upload result records.
 */
export async function publishVideos({ topic = null, type = null } = {}) {
  const auth = buildOAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });

  const files = await fs.readdir(OUTPUT_DIR).catch(() => []);
  const mp4s = files.filter((f) => f.endsWith('.mp4')).sort();

  if (mp4s.length === 0) {
    console.log('No MP4 files found in videos/output/. Run the video assembler first.');
    return [];
  }

  const uploads = await loadUploads();
  const uploadedKeys = new Set(uploads.map((u) => u.key));

  const results = [];

  for (const filename of mp4s) {
    // Expected pattern: YYYY-MM-DD-<topic>-(short|long).mp4
    const match = filename.match(/^(\d{4}-\d{2}-\d{2})-(.+)-(short|long)\.mp4$/);
    if (!match) {
      console.warn(`  Skipping unrecognised filename: ${filename}`);
      continue;
    }
    const [, fileDate, fileTopic, fileType] = match;

    if (topic && fileTopic !== topic) continue;
    if (type && fileType !== type) continue;

    const key = `${fileDate}-${fileTopic}-${fileType}`;

    if (uploadedKeys.has(key)) {
      console.log(`  Already uploaded: ${key} — skipping`);
      continue;
    }

    const script = await readScript(fileDate, fileTopic);
    if (!script) {
      console.warn(`  No script JSON for ${fileDate}-${fileTopic} — skipping`);
      continue;
    }

    const metadata = buildMetadata(script, fileType);

    console.log(`\nUploading: ${filename}`);
    console.log(`  Title    : ${metadata.snippet.title}`);
    console.log(`  Schedule : ${metadata.status.publishAt}`);

    try {
      const videoData = await uploadVideo(
        youtube,
        path.join(OUTPUT_DIR, filename),
        metadata,
      );

      const record = {
        key,
        videoId: videoData.id,
        title: metadata.snippet.title,
        type: fileType,
        date: fileDate,
        topic: fileTopic,
        uploadedAt: new Date().toISOString(),
        scheduledPublishAt: metadata.status.publishAt,
        status: 'scheduled',
        url: `https://youtu.be/${videoData.id}`,
      };

      uploads.push(record);
      uploadedKeys.add(key);
      results.push(record);

      console.log(`  ✅  Uploaded  : https://youtu.be/${videoData.id}`);
      console.log(`  📅  Publishes : ${metadata.status.publishAt}`);
    } catch (err) {
      const errorRecord = { key, error: err.message, status: 'failed' };
      results.push(errorRecord);
      console.error(`  ❌  Failed    : ${err.message}`);

      // Quota errors are fatal — stop to avoid wasting remaining quota.
      if (err.message.includes('quotaExceeded') || err.message.includes('forbidden')) {
        console.error('\nQuota exceeded or forbidden. Stopping upload run.');
        break;
      }
    }
  }

  await saveUploads(uploads);

  const succeeded = results.filter((r) => r.status === 'scheduled').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const skipped = mp4s.length - results.length;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Uploaded: ${succeeded}  |  Failed: ${failed}  |  Skipped (already done): ${skipped}`);

  return results;
}

// ── CLI entry point ────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);

  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };

  publishVideos({
    topic: get('--topic'),
    type: get('--type'),
  }).catch((err) => {
    console.error('\nFatal error:', err.message);
    process.exit(1);
  });
}
