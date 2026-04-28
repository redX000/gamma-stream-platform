/**
 * @fileoverview Video script generator for Gamma Stream Platform.
 * Fetches the latest published WordPress post and uses Claude API to generate
 * a 60-second short-form script and a 5-minute long-form script for YouTube/TikTok.
 * Saves output to videos/scripts/YYYY-MM-DD-{slug}.json.
 *
 * Usage: node content-pipeline/video-script-generator.js [--post-id <id>]
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.join(__dirname, '..', 'videos', 'scripts');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
 * @param {number|null} postId - Optional post ID; if null fetches most recent
 * @returns {Promise<Object>} WordPress post object with id, slug, title, content, link
 */
async function fetchLatestPost(token, postId = null) {
  const { default: fetch } = await import('node-fetch');
  const base = process.env.WORDPRESS_URL?.replace(/\/$/, '');

  const url = postId
    ? `${base}/wp-json/wp/v2/posts/${postId}`
    : `${base}/wp-json/wp/v2/posts?status=publish&per_page=1&orderby=date&order=desc`;

  console.log(`[video-script] Fetching post: ${url}`);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`WordPress API error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const post = postId ? data : data[0];

  if (!post) throw new Error('No published posts found on WordPress');

  return {
    id: post.id,
    slug: post.slug,
    title: post.title?.rendered?.replace(/<[^>]+>/g, '') || 'Untitled',
    content: post.content?.rendered?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || '',
    link: post.link,
    date: (post.date || '').slice(0, 10),
  };
}

/**
 * Generate short and long video scripts from article content using Claude API.
 * @param {Object} post - WordPress post object
 * @returns {Promise<Object>} Script object with shortScript, longScript, keywords, voice
 */
async function generateScripts(post) {
  console.log(`[video-script] Generating scripts for: "${post.title}"`);

  // Trim content to ~3000 chars to stay within token limits
  const snippet = post.content.slice(0, 3000);

  const systemPrompt = `You are a YouTube/TikTok script writer for an AI tools review channel.
You write punchy, engaging scripts that hook viewers in the first 3 seconds and drive them to affiliate links.
Always write in first person ("I", "we") and end with a clear CTA.`;

  const userPrompt = `Write two video scripts based on this article:

Title: ${post.title}
URL: ${post.link}
Content (excerpt): ${snippet}

Return a JSON object with exactly these keys:
{
  "shortScript": "60-second TikTok/Shorts script (~120 words). Hook in first sentence. 3 punchy points. End with CTA to check description link.",
  "longScript": "5-minute YouTube script (~700 words). Strong hook. Intro with credibility. Cover 5 key points with detail. Soft sell affiliate links. CTA to subscribe + like.",
  "keywords": "5–8 space-separated keywords for video SEO tags",
  "voice": "en-US-GuyNeural"
}

Output ONLY valid JSON — no markdown, no code fences, no extra text.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = response.content[0].text.trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Attempt to extract JSON if model wrapped it in markdown
    const match = raw.match(/\{[\s\S]+\}/);
    if (!match) throw new Error(`Claude returned non-JSON output: ${raw.slice(0, 300)}`);
    parsed = JSON.parse(match[0]);
  }

  console.log(`[video-script] Scripts generated — short: ${parsed.shortScript?.split(' ').length} words, long: ${parsed.longScript?.split(' ').length} words`);
  return parsed;
}

/**
 * Save the generated script to disk.
 * @param {Object} post - WordPress post object
 * @param {Object} scripts - Generated scripts from Claude
 * @returns {Promise<string>} Path to saved file
 */
async function saveScript(post, scripts) {
  await fs.mkdir(SCRIPTS_DIR, { recursive: true });

  const date = post.date || new Date().toISOString().slice(0, 10);
  const filename = `${date}-${post.slug}.json`;
  const filePath = path.join(SCRIPTS_DIR, filename);

  const output = {
    postId: post.id,
    postUrl: post.link,
    topic: post.slug,
    title: post.title,
    date,
    voice: scripts.voice || 'en-US-GuyNeural',
    keywords: scripts.keywords || '',
    shortScript: scripts.shortScript || '',
    longScript: scripts.longScript || '',
    generatedAt: new Date().toISOString(),
  };

  await fs.writeFile(filePath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`[video-script] Script saved: ${filePath}`);
  return filePath;
}

// Main entry point
async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  if (!process.env.WORDPRESS_URL) throw new Error('WORDPRESS_URL is not set');

  const postIdArg = process.argv.indexOf('--post-id');
  const postId = postIdArg !== -1 ? parseInt(process.argv[postIdArg + 1], 10) : null;

  const token = await getJwtToken();
  const post = await fetchLatestPost(token, postId);
  console.log(`[video-script] Processing post: "${post.title}" (${post.link})`);

  const scripts = await generateScripts(post);
  const savedPath = await saveScript(post, scripts);

  console.log(`[video-script] Done → ${savedPath}`);
  return savedPath;
}

main().catch((err) => {
  console.error(`[video-script] Fatal: ${err.message}`);
  process.exit(1);
});
