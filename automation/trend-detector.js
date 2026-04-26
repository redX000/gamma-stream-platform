/**
 * @fileoverview Trend detector for Gamma Stream Platform.
 * Fetches trending AI/tech topics from Google Trends RSS and Reddit's public
 * JSON API — both completely free with no API keys required.
 *
 * Sources:
 *   Google Trends RSS  — https://trends.google.com/trending/rss?geo=US
 *   Reddit r/artificial — top posts today via public .json endpoint
 *   Reddit r/ChatGPT   — top posts today via public .json endpoint
 *
 * Topics are filtered for AI tools / tech / productivity / make-money relevance,
 * scored by traffic volume or upvotes, deduplicated across sources, and ranked.
 *
 * Export:
 *   getTrendingTopics() → Array<{ topic, score, source, url? }>  (top 5)
 *
 * Usage:
 *   import { getTrendingTopics } from './trend-detector.js';
 *   node automation/trend-detector.js   ← saves top 5 to trends/latest.json
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRENDS_FILE = path.join(__dirname, '..', 'trends', 'latest.json');

const REDDIT_UA = 'GammaStream/1.0 (https://gammacash.online; AI affiliate content platform)';
const FETCH_TIMEOUT_MS = 15_000;

// ─────────────────────────────────────────────────────────────────
// Relevance filter — topics must contain at least one of these
// ─────────────────────────────────────────────────────────────────

const NICHE_KEYWORDS = [
  // AI / LLM
  'ai', 'gpt', 'chatgpt', 'claude', 'gemini', 'llm', 'openai', 'anthropic',
  'artificial intelligence', 'machine learning', 'deep learning', 'neural',
  'midjourney', 'stable diffusion', 'dall-e', 'copilot', 'perplexity', 'bard',
  // Tools / SaaS
  'jasper', 'surfer seo', 'copy.ai', 'writesonic', 'grammarly', 'canva',
  'zapier', 'convertkit', 'notion', 'figma', 'bing', 'sora',
  'tool', 'software', 'app', 'saas', 'plugin', 'extension', 'automation',
  // Content / SEO / Marketing
  'seo', 'content', 'writing', 'blog', 'copywriting', 'marketing',
  // Money / productivity
  'make money', 'passive income', 'affiliate', 'monetize', 'income',
  'productivity', 'workflow', 'startup', 'tech', 'technology',
];

function isNicheRelevant(text) {
  const lower = (text || '').toLowerCase();
  return NICHE_KEYWORDS.some(kw => lower.includes(kw));
}

// ─────────────────────────────────────────────────────────────────
// Google Trends RSS
// ─────────────────────────────────────────────────────────────────

function parseTrafficString(s) {
  // "500,000+" → 500000
  const digits = (s || '').replace(/[^0-9]/g, '');
  return parseInt(digits, 10) || 0;
}

function parseTrendsRss(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;

  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];

    // Title may be plain or CDATA-wrapped
    const title = (
      /<title><!\[CDATA\[(.*?)\]\]><\/title>/i.exec(block)?.[1] ||
      /<title>([^<]+)<\/title>/i.exec(block)?.[1] ||
      ''
    ).trim();

    const traffic = /<ht:approx_traffic>([^<]+)<\/ht:approx_traffic>/i.exec(block)?.[1] || '';

    // Use news snippet for extra relevance context
    const snippet = (
      /<ht:news_item_snippet><!\[CDATA\[(.*?)\]\]><\/ht:news_item_snippet>/i.exec(block)?.[1] ||
      /<ht:news_item_snippet>([^<]+)<\/ht:news_item_snippet>/i.exec(block)?.[1] ||
      ''
    ).trim();

    if (title) {
      items.push({ title, traffic: parseTrafficString(traffic), context: `${title} ${snippet}` });
    }
  }

  return items;
}

async function fetchGoogleTrends() {
  console.log('[trends] Fetching Google Trends RSS (US)...');
  try {
    const { default: fetch } = await import('node-fetch');
    const res = await fetch('https://trends.google.com/trending/rss?geo=US', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GammaStream/1.0)' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(`[trends] Google Trends RSS returned ${res.status} — skipping`);
      return [];
    }

    const xml = await res.text();
    const items = parseTrendsRss(xml);
    const relevant = items.filter(i => isNicheRelevant(i.context));

    console.log(`[trends] Google Trends: ${items.length} total, ${relevant.length} niche-relevant`);

    const maxTraffic = Math.max(...relevant.map(i => i.traffic), 1);

    return relevant.map(i => ({
      topic: i.title,
      rawScore: Math.round((i.traffic / maxTraffic) * 100),
      source: 'google-trends',
    }));
  } catch (err) {
    console.warn(`[trends] Google Trends failed (non-fatal): ${err.message}`);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
// Reddit public JSON API
// ─────────────────────────────────────────────────────────────────

async function fetchRedditTrends(subreddit) {
  const url = `https://www.reddit.com/r/${subreddit}/top.json?limit=25&t=day`;
  console.log(`[trends] Fetching r/${subreddit} top posts...`);

  try {
    const { default: fetch } = await import('node-fetch');
    const res = await fetch(url, {
      headers: { 'User-Agent': REDDIT_UA },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(`[trends] r/${subreddit} returned ${res.status} — skipping`);
      return [];
    }

    const data = await res.json();
    const posts = (data?.data?.children || []).map(c => c.data);
    const relevant = posts.filter(p =>
      isNicheRelevant(p.title + ' ' + (p.selftext || ''))
    );

    console.log(`[trends] r/${subreddit}: ${posts.length} posts, ${relevant.length} niche-relevant`);

    const maxScore = Math.max(...relevant.map(p => p.score), 1);

    return relevant.map(p => ({
      topic: p.title
        .replace(/\[.*?\]/g, '')   // strip tags like [OC], [Image]
        .replace(/\s{2,}/g, ' ')
        .trim(),
      rawScore: Math.round((p.score / maxScore) * 100),
      source: `reddit/r/${subreddit}`,
      url: `https://reddit.com${p.permalink}`,
    }));
  } catch (err) {
    console.warn(`[trends] r/${subreddit} failed (non-fatal): ${err.message}`);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
// Merge, deduplicate, and rank
// ─────────────────────────────────────────────────────────────────

function mergeAndRank(allItems) {
  const map = new Map();

  for (const item of allItems) {
    // Normalise key: lowercase + collapse whitespace
    const key = item.topic.toLowerCase().replace(/\s+/g, ' ').trim();

    if (map.has(key)) {
      const existing = map.get(key);
      // Average the scores; list all sources
      existing.score = Math.round((existing.score + item.rawScore) / 2);
      if (!existing.source.includes(item.source)) {
        existing.source += `, ${item.source}`;
      }
    } else {
      map.set(key, {
        topic: item.topic,
        score: item.rawScore,
        source: item.source,
        ...(item.url ? { url: item.url } : {}),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.score - a.score);
}

// ─────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────

/**
 * Fetch and return the top 5 trending topics relevant to the AI/SaaS niche.
 * All sources are fetched in parallel; individual failures are non-fatal.
 *
 * @returns {Promise<Array<{topic: string, score: number, source: string, url?: string}>>}
 */
export async function getTrendingTopics() {
  const [googleItems, redditArtificial, redditChatGPT] = await Promise.all([
    fetchGoogleTrends(),
    fetchRedditTrends('artificial'),
    fetchRedditTrends('ChatGPT'),
  ]);

  const ranked = mergeAndRank([...googleItems, ...redditArtificial, ...redditChatGPT]);
  const top5 = ranked.slice(0, 5);

  console.log(`[trends] Top ${top5.length} trending topics:`);
  for (const t of top5) console.log(`  [${t.score}] ${t.topic} (${t.source})`);

  return top5;
}

// ─────────────────────────────────────────────────────────────────
// CLI entry — run and save to trends/latest.json
// ─────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    console.log('[trends] Starting trend detection...\n');
    const topics = await getTrendingTopics();

    if (topics.length === 0) {
      console.warn('\n[trends] No niche-relevant trends found — leaving existing trends/latest.json unchanged');
      process.exit(0);
    }

    const output = {
      fetchedAt: new Date().toISOString(),
      topicCount: topics.length,
      topics,
    };

    await fs.mkdir(path.dirname(TRENDS_FILE), { recursive: true });
    await fs.writeFile(TRENDS_FILE, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`\n[trends] Saved ${topics.length} topics → ${TRENDS_FILE}`);
  })().catch(err => {
    console.error(`[trends] Fatal: ${err.message}`);
    process.exit(1);
  });
}
