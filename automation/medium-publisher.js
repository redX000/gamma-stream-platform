/**
 * @fileoverview Medium auto-publisher for Gamma Stream Platform.
 * Fetches the latest published WordPress post and cross-posts it to Medium
 * with a canonical URL pointing back to gammacash.online (SEO-safe).
 *
 * Requires env: WORDPRESS_URL, WORDPRESS_USERNAME, WORDPRESS_PASSWORD, MEDIUM_INTEGRATION_TOKEN
 *   (NOTE: Medium deprecated public Integration Tokens in 2023 — only legacy tokens work)
 *
 * Usage: node automation/medium-publisher.js [--post-id <id>]
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLISHED_LOG = path.join(__dirname, '..', 'analytics', 'medium-published.json');

/**
 * Obtain a JWT token from the WordPress JWT Auth plugin.
 * @returns {Promise<string>} JWT token
 */
async function getJwtToken() {
  const { default: fetch } = await import('node-fetch');
  const base = process.env.WORDPRESS_URL?.replace(/\/$/, '');
  if (!base) throw new Error('WORDPRESS_URL is not set');

  const res = await fetch(`${base}/wp-json/jwt-auth/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.WORDPRESS_USERNAME,
      password: process.env.WORDPRESS_PASSWORD,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new Error(`JWT auth failed ${res.status}: ${data.message || JSON.stringify(data).slice(0, 200)}`);
  }
  return data.token;
}

/**
 * Fetch the latest published WordPress post (or a specific post by ID).
 * @param {string} token - JWT token
 * @param {number|null} postId - Optional post ID; null fetches most recent
 * @returns {Promise<Object>} Post with id, slug, title, content (HTML), link, date
 */
async function fetchLatestPost(token, postId = null) {
  const { default: fetch } = await import('node-fetch');
  const base = process.env.WORDPRESS_URL?.replace(/\/$/, '');

  const url = postId
    ? `${base}/wp-json/wp/v2/posts/${postId}`
    : `${base}/wp-json/wp/v2/posts?status=publish&per_page=1&orderby=date&order=desc`;

  console.log(`[medium] Fetching post: ${url}`);

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`WordPress API error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const post = postId ? data : data[0];
  if (!post) throw new Error('No published posts found');

  return {
    id: post.id,
    slug: post.slug,
    title: post.title?.rendered?.replace(/<[^>]+>/g, '') || 'Untitled',
    // Keep HTML — Medium API accepts HTML content
    content: post.content?.rendered || '',
    link: post.link,
    date: (post.date || '').slice(0, 10),
    excerpt: post.excerpt?.rendered?.replace(/<[^>]+>/g, '').trim() || '',
  };
}

/**
 * Load the log of already-published Medium posts to avoid duplicates.
 * @returns {Promise<Set<number>>} Set of WordPress post IDs already cross-posted
 */
async function loadPublishedLog() {
  try {
    const raw = await fs.readFile(PUBLISHED_LOG, 'utf-8');
    const entries = JSON.parse(raw);
    return new Set(entries.map((e) => e.wpPostId));
  } catch {
    return new Set();
  }
}

/**
 * Append a successfully published entry to the log.
 * @param {Object} entry - { wpPostId, mediumPostId, mediumUrl, publishedAt }
 */
async function appendPublishedLog(entry) {
  let entries = [];
  try {
    const raw = await fs.readFile(PUBLISHED_LOG, 'utf-8');
    entries = JSON.parse(raw);
  } catch {
    // File doesn't exist yet — start fresh
  }
  entries.push(entry);
  await fs.mkdir(path.dirname(PUBLISHED_LOG), { recursive: true });
  await fs.writeFile(PUBLISHED_LOG, JSON.stringify(entries, null, 2), 'utf-8');
}

/**
 * Get the authenticated Medium user ID.
 * @param {string} token - Medium integration token
 * @returns {Promise<string>} Medium user ID
 */
async function getMediumUserId(token) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch('https://api.medium.com/v1/me', {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.data?.id) {
    throw new Error(`Medium /me failed ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }

  console.log(`[medium] Authenticated as: ${data.data.name} (${data.data.username})`);
  return data.data.id;
}

/**
 * Publish a post to Medium under the authenticated user.
 * @param {string} userId - Medium user ID
 * @param {string} token - Medium integration token
 * @param {Object} post - WordPress post object
 * @returns {Promise<Object>} Medium API response data
 */
async function publishToMedium(userId, token, post) {
  const { default: fetch } = await import('node-fetch');

  // Append canonical link disclosure at end of content
  const canonicalNotice = `<p><em>Originally published at <a href="${post.link}">${post.link}</a></em></p>`;
  const fullContent = post.content + canonicalNotice;

  const body = {
    title: post.title,
    contentFormat: 'html',
    content: fullContent,
    canonicalUrl: post.link,
    publishStatus: 'public',
    // Tags inferred from title keywords (max 5)
    tags: post.title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 5),
  };

  console.log(`[medium] Publishing to Medium: "${post.title}"`);

  const res = await fetch(`https://api.medium.com/v1/users/${userId}/posts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(`Medium publish failed ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }

  console.log(`[medium] Published! URL: ${data.data?.url}`);
  return data.data;
}

// Main entry point
async function main() {
  const token = process.env.MEDIUM_INTEGRATION_TOKEN;
  if (!token) {
    console.log('[medium] MEDIUM_INTEGRATION_TOKEN not set — skipping.');
    console.log('[medium] NOTE: Medium deprecated public Integration Tokens in 2023.');
    console.log('[medium] Only legacy tokens issued before then still work. New tokens cannot be created.');
    process.exit(0);
  }
  if (!process.env.WORDPRESS_URL) throw new Error('WORDPRESS_URL is not set');

  const postIdArg = process.argv.indexOf('--post-id');
  const postId = postIdArg !== -1 ? parseInt(process.argv[postIdArg + 1], 10) : null;

  const alreadyPublished = await loadPublishedLog();

  const wpToken = await getJwtToken();
  const post = await fetchLatestPost(wpToken, postId);

  if (alreadyPublished.has(post.id)) {
    console.log(`[medium] Post #${post.id} already cross-posted to Medium — skipping`);
    return;
  }

  const userId = await getMediumUserId(token);
  const mediumPost = await publishToMedium(userId, token, post);

  await appendPublishedLog({
    wpPostId: post.id,
    wpUrl: post.link,
    mediumPostId: mediumPost.id,
    mediumUrl: mediumPost.url,
    publishedAt: new Date().toISOString(),
  });

  console.log(`[medium] Done → ${mediumPost.url}`);
}

main().catch((err) => {
  console.error(`[medium] Fatal: ${err.message}`);
  process.exit(1);
});
