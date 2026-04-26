/**
 * @fileoverview Content scheduler for Gamma Stream Platform.
 * Manages a rotating keyword queue and publishes 3 articles/week (Mon/Wed/Fri).
 * Designed to run as a GitHub Actions cron job (daily at 06:00 UTC).
 *
 * Pipeline: check publish day → pick next keyword → generate → SEO score → save → publish
 *
 * Usage:
 *   node scheduler.js            # Run full pipeline (publish if today is Mon/Wed/Fri)
 *   node scheduler.js --dry-run  # Generate and score but skip WordPress publish
 *   node scheduler.js --force    # Run pipeline regardless of day
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateArticle, saveArticle } from './generator.js';
import { scoreArticle } from './seo-optimizer.js';
import { publishArticle } from './publisher.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Persist queue state across GitHub Actions runs using a JSON file
const QUEUE_FILE = path.join(__dirname, 'queue.json');

// Trends file written daily by automation/trend-detector.js
const TRENDS_FILE = path.join(__dirname, '..', 'trends', 'latest.json');

// Publish on Monday (1), Wednesday (3), Friday (5) — 3 articles/week
const PUBLISH_DAYS = [1, 3, 5];

// Minimum SEO score to auto-publish (below this → saved as draft for manual review)
const MIN_PUBLISH_SCORE = 50;

/**
 * Seed keyword queue covering all content types in the target rotation:
 * 40% review, 30% comparison, 20% tutorial, 10% top-list.
 * Add more entries here to keep the pipeline running indefinitely.
 */
const KEYWORD_QUEUE = [
  { keyword: 'Jasper AI review 2025', tool: 'Jasper AI', type: 'review' },
  { keyword: 'Jasper AI vs Copy.ai', tool: 'Jasper AI', type: 'comparison', competitor: 'Copy.ai' },
  { keyword: 'Surfer SEO review', tool: 'Surfer SEO', type: 'review' },
  { keyword: 'best AI writing tools 2025', tool: 'Jasper AI', type: 'top-list' },
  { keyword: 'how to use ChatGPT for blog writing', tool: 'ChatGPT', type: 'tutorial' },
  { keyword: 'Copy.ai review 2025', tool: 'Copy.ai', type: 'review' },
  { keyword: 'Notion AI vs Obsidian AI', tool: 'Notion AI', type: 'comparison', competitor: 'Obsidian' },
  { keyword: 'how to automate content with Zapier', tool: 'Zapier', type: 'tutorial' },
  { keyword: 'best AI SEO tools 2025', tool: 'Surfer SEO', type: 'top-list' },
  { keyword: 'ConvertKit review for bloggers', tool: 'ConvertKit', type: 'review' },
  { keyword: 'Systeme.io vs ClickFunnels', tool: 'Systeme.io', type: 'comparison', competitor: 'ClickFunnels' },
  { keyword: 'how to start AI affiliate marketing', tool: 'Jasper AI', type: 'tutorial' },
  { keyword: 'Scalenut review 2025', tool: 'Scalenut', type: 'review' },
  { keyword: 'Jasper AI vs Scalenut', tool: 'Jasper AI', type: 'comparison', competitor: 'Scalenut' },
  { keyword: 'best SaaS affiliate programs 2025', tool: 'Systeme.io', type: 'top-list' },
  { keyword: 'how to use Surfer SEO step by step', tool: 'Surfer SEO', type: 'tutorial' },
  { keyword: 'Zapier review for non-technical users', tool: 'Zapier', type: 'review' },
  { keyword: 'Copy.ai vs Writesonic', tool: 'Copy.ai', type: 'comparison', competitor: 'Writesonic' },
  { keyword: 'Systeme.io review 2025', tool: 'Systeme.io', type: 'review' },
  { keyword: 'how to build an email list with ConvertKit', tool: 'ConvertKit', type: 'tutorial' },
];

// ── Trend integration ────────────────────────────────────────────

// Maps lowercase substrings found in trend topics → known tool names
const TREND_TOOL_MAP = {
  chatgpt: 'ChatGPT', gpt: 'ChatGPT', openai: 'ChatGPT',
  claude: 'Claude', anthropic: 'Claude',
  gemini: 'Google Gemini', bard: 'Google Gemini',
  jasper: 'Jasper AI',
  'copy.ai': 'Copy.ai', copyai: 'Copy.ai',
  writesonic: 'Writesonic',
  'surfer seo': 'Surfer SEO', surfer: 'Surfer SEO',
  grammarly: 'Grammarly',
  canva: 'Canva',
  midjourney: 'Midjourney',
  perplexity: 'Perplexity AI',
  notion: 'Notion AI',
  zapier: 'Zapier',
  convertkit: 'ConvertKit',
};

/**
 * Load trending topics from trends/latest.json.
 * Returns an empty array if the file is missing, unreadable, or older than 25 hours.
 * @returns {Promise<Array>}
 */
async function loadTrends() {
  try {
    const raw = await fs.readFile(TRENDS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!data.fetchedAt || !Array.isArray(data.topics) || data.topics.length === 0) return [];
    const ageHours = (Date.now() - new Date(data.fetchedAt).getTime()) / 3_600_000;
    if (ageHours > 25) {
      console.log(`[scheduler] Trends are ${Math.round(ageHours)}h old — falling back to static queue`);
      return [];
    }
    console.log(`[scheduler] Loaded ${data.topics.length} fresh trend(s) (${Math.round(ageHours)}h old)`);
    return data.topics;
  } catch {
    return [];
  }
}

/**
 * Convert a trending topic entry into a keyword queue item for the generator.
 * Detects a known tool in the topic text; defaults to ChatGPT when none matches.
 * @param {{ topic: string, score: number, source: string }} trend
 * @returns {{ keyword: string, tool: string, type: string, fromTrend: boolean }}
 */
function trendToKeywordItem(trend) {
  const topicLower = trend.topic.toLowerCase();

  let tool = 'ChatGPT';
  for (const [pattern, name] of Object.entries(TREND_TOOL_MAP)) {
    if (topicLower.includes(pattern)) { tool = name; break; }
  }

  let type = 'tutorial';
  if (/\bvs\.?\b|compar/i.test(trend.topic))               type = 'comparison';
  else if (/\bbest\b|\btop\s*\d|\blist\b/i.test(trend.topic)) type = 'top-list';
  else if (/\breview\b|\bworth\b|\bpricing\b/i.test(trend.topic)) type = 'review';

  // Keep keyword ≤ 70 chars — truncate at a word boundary
  const keyword = trend.topic.length > 70
    ? trend.topic.slice(0, 67).replace(/\s\S*$/, '') + '...'
    : trend.topic;

  return { keyword, tool, type, fromTrend: true, trendScore: trend.score, trendSource: trend.source };
}

// ── Queue persistence ────────────────────────────────────────────

/**
 * Load the current queue state from disk.
 * Returns a fresh state object if no queue file exists yet.
 * @returns {Promise<Object>} Queue state: { index, published[], lastRun }
 */
async function loadQueue() {
  try {
    const raw = await fs.readFile(QUEUE_FILE, 'utf-8');
    const queue = JSON.parse(raw);
    console.log(`[scheduler] Loaded queue — index: ${queue.index}, total published: ${queue.published.length}`);
    return queue;
  } catch {
    console.log('[scheduler] No queue file found — starting fresh');
    return { index: 0, published: [], lastRun: null };
  }
}

/**
 * Persist queue state to disk so GitHub Actions can resume where it left off.
 * @param {Object} queue - Queue state object
 */
async function saveQueue(queue) {
  await fs.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf-8');
  console.log(`[scheduler] Queue saved — next index: ${queue.index}`);
}

/**
 * Determine if today is a scheduled publishing day (Mon/Wed/Fri).
 * @returns {boolean} True if the pipeline should run today
 */
export function isPublishDay() {
  const day = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const scheduled = PUBLISH_DAYS.includes(day);
  console.log(`[scheduler] Day of week: ${day} — publish scheduled: ${scheduled}`);
  return scheduled;
}

/**
 * Pick the next keyword assignment from the rotating queue.
 * @param {Object} queue - Current queue state
 * @returns {Object} Keyword item: { keyword, tool, type, competitor? }
 */
export function getNextKeyword(queue) {
  const item = KEYWORD_QUEUE[queue.index % KEYWORD_QUEUE.length];
  console.log(`[scheduler] Next item [${queue.index % KEYWORD_QUEUE.length}]: "${item.keyword}" (${item.type})`);
  return item;
}

/**
 * Run the full content pipeline for one article.
 * Steps: generate → SEO score → save to disk → publish to WordPress.
 *
 * @param {boolean} [dryRun=false] - If true, skip WordPress publish (generate + score only)
 * @param {boolean} [force=false] - If true, run even if today is not a publish day
 * @returns {Promise<Object>} Pipeline result summary
 */
export async function runPipeline(dryRun = false, force = false) {
  console.log(`[scheduler] Pipeline start — ${new Date().toISOString()} | dryRun: ${dryRun} | force: ${force}`);

  // Skip if not a publish day (unless forced)
  if (!force && !isPublishDay()) {
    console.log('[scheduler] Not a publish day — exiting. Use --force to override.');
    return { status: 'skipped', reason: 'not a publish day' };
  }

  const queue = await loadQueue();

  // Prefer a fresh trending topic if one hasn't been used this cycle
  const trends = await loadTrends();
  const usedTrendSet = new Set(queue.usedTrends || []);
  const freshTrend = trends.find(t => !usedTrendSet.has(t.topic));

  let item;
  if (freshTrend) {
    item = trendToKeywordItem(freshTrend);
    queue.usedTrends = [...(queue.usedTrends || []), freshTrend.topic].slice(-20);
    console.log(`[scheduler] Trend-driven topic: "${item.keyword}" (score: ${freshTrend.score}, source: ${freshTrend.source})`);
  } else {
    item = getNextKeyword(queue);
  }

  // Stage 1: Generate article
  console.log(`[scheduler] Stage 1 — Generating article...`);
  let article;
  try {
    article = await generateArticle(item);
    console.log(`[scheduler] Generated: "${article.title}" (${article.wordCount} words)`);
  } catch (err) {
    console.error(`[scheduler] Generation failed: ${err.message}`);
    return { status: 'error', stage: 'generate', error: err.message };
  }

  // Stage 2: SEO score
  console.log(`[scheduler] Stage 2 — SEO analysis...`);
  let seoResult;
  try {
    seoResult = await scoreArticle(article);
    console.log(`[scheduler] SEO score: ${seoResult.score}/100`);
    if (seoResult.issues.length > 0) {
      console.warn(`[scheduler] SEO issues: ${seoResult.issues.join('; ')}`);
    }
  } catch (err) {
    console.warn(`[scheduler] SEO scoring failed (non-fatal): ${err.message}`);
    seoResult = { score: 0, passed: [], issues: ['SEO scoring failed'] };
  }

  // Stage 3: Save to disk
  console.log(`[scheduler] Stage 3 — Saving to disk...`);
  let savedPath;
  try {
    savedPath = await saveArticle(article);
  } catch (err) {
    console.error(`[scheduler] Save failed: ${err.message}`);
    return { status: 'error', stage: 'save', error: err.message };
  }

  // Stage 4: Publish to WordPress (skipped only in dry-run)
  console.log(`[scheduler] Stage 4 — Publishing...`);
  let publishResult = null;

  if (dryRun) {
    console.log('[scheduler] Dry run — skipping WordPress publish');
  } else if (!process.env.WORDPRESS_URL) {
    console.error('[scheduler] WORDPRESS_URL is not set — cannot publish. Check GitHub Actions secrets.');
    return { status: 'error', stage: 'publish', error: 'WORDPRESS_URL environment variable is not set' };
  } else {
    // Auto-publish if SEO score is sufficient; otherwise save as WP draft for review
    const postStatus = seoResult.score >= MIN_PUBLISH_SCORE ? 'publish' : 'draft';
    if (postStatus === 'draft') {
      console.warn(`[scheduler] SEO score ${seoResult.score} < ${MIN_PUBLISH_SCORE} — publishing as draft for manual review`);
    }
    try {
      publishResult = await publishArticle(article, { status: postStatus });
      console.log(`[scheduler] Published — WP ID: ${publishResult.id}, status: ${postStatus}, URL: ${publishResult.link}`);
    } catch (err) {
      console.error(`[scheduler] WordPress publish failed: ${err.message}`);
      return { status: 'error', stage: 'publish', error: err.message };
    }
  }

  // Stage 5: Advance queue — only move the static index when a static item was used
  if (!item.fromTrend) {
    queue.index = (queue.index + 1) % KEYWORD_QUEUE.length;
  }
  queue.lastRun = new Date().toISOString();
  queue.published.push({
    keyword: item.keyword,
    title: article.title,
    type: item.type,
    seoScore: seoResult.score,
    savedPath,
    publishedAt: publishResult ? new Date().toISOString() : null,
    wpPostId: publishResult?.id || null,
    wpUrl: publishResult?.link || null,
  });
  await saveQueue(queue);

  const result = {
    status: 'success',
    article: { title: article.title, wordCount: article.wordCount, type: article.type },
    seoScore: seoResult.score,
    seoIssues: seoResult.issues,
    savedPath,
    published: !!publishResult,
    wpPostId: publishResult?.id || null,
    wpUrl: publishResult?.link || null,
  };

  console.log('[scheduler] Pipeline complete:', JSON.stringify(result, null, 2));
  return result;
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dryRun = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');

  runPipeline(dryRun, force)
    .then((result) => {
      if (result.status === 'error') {
        console.error(`[scheduler] Pipeline failed at stage "${result.stage}": ${result.error}`);
        process.exit(1);
      }
      console.log(`[scheduler] Done — status: ${result.status}`);
    })
    .catch((err) => {
      console.error(`[scheduler] Fatal error: ${err.message}`);
      process.exit(1);
    });
}
