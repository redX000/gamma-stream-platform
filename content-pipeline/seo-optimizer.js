/**
 * @fileoverview SEO optimization module for Gamma Stream Platform.
 * Analyzes keyword density, generates optimized titles and meta descriptions,
 * checks content structure, and produces an SEO readiness score (0–100).
 * Uses claude-haiku-4-5 for fast, low-cost title and meta generation.
 *
 * Usage: node seo-optimizer.js titles "<tool>" "<keyword>"
 */

import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Analyze keyword density in article content.
 * Strips markdown syntax before counting to avoid false positives.
 * @param {string} content - Article markdown content
 * @param {string} keyword - Target keyword phrase
 * @returns {Object} density, occurrences, wordCount, status
 */
export function analyzeKeywordDensity(content, keyword) {
  console.log(`[seo] Analyzing keyword density for: "${keyword}"`);

  // Strip markdown syntax to get plain text word count
  const plainText = content
    .replace(/^#{1,6}\s+/gm, '')   // headings
    .replace(/\*\*?.+?\*\*?/g, (m) => m.replace(/\*/g, ''))  // bold/italic
    .replace(/`[^`]+`/g, '')        // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → anchor text
    .replace(/[|>]/g, '')           // tables and blockquotes
    .toLowerCase();

  const words = plainText.split(/\s+/).filter(Boolean);
  const keywordWords = keyword.toLowerCase().split(/\s+/);
  const primaryWord = keywordWords[0];

  // Count occurrences of the primary keyword word (partial phrase matching)
  const occurrences = words.filter((w) => w.startsWith(primaryWord)).length;
  const density = words.length > 0 ? parseFloat(((occurrences / words.length) * 100).toFixed(2)) : 0;

  const status = density >= 0.5 && density <= 2.5 ? 'optimal' : density < 0.5 ? 'too-low' : 'too-high';
  console.log(`[seo] Density: ${density}% (${occurrences}/${words.length} words) — ${status}`);

  return { density, occurrences, wordCount: words.length, status };
}

/**
 * Generate 5 SEO-optimized title options using Claude Haiku (fast & cheap).
 * @param {string} keyword - Target keyword
 * @param {string} tool - Primary tool name
 * @param {string} type - Content type (review, comparison, top-list, tutorial)
 * @returns {Promise<string[]>} Array of 5 title options
 */
export async function generateSeoTitles(keyword, tool, type) {
  console.log(`[seo] Generating SEO titles for: "${keyword}"`);

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set in .env');
  }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Generate 5 SEO-optimized article titles for:
- Keyword: "${keyword}"
- Tool: "${tool}"
- Content type: ${type}

Rules:
- 50–60 characters each
- Include the primary keyword naturally
- Use power words (Best, Ultimate, Complete, Honest, Tested)
- Use numbers where they fit naturally (e.g., "7 Reasons", "2025")
- Output ONLY a valid JSON array of 5 strings — no other text`,
      },
    ],
  });

  try {
    const titles = JSON.parse(response.content[0].text.trim());
    console.log(`[seo] Generated ${titles.length} title options`);
    return titles;
  } catch {
    // Fallback: split raw lines if JSON parse fails
    const lines = response.content[0].text.split('\n').filter((l) => l.trim().length > 10);
    console.warn('[seo] JSON parse failed — falling back to line split');
    return lines.slice(0, 5);
  }
}

/**
 * Generate an optimized meta description (max 160 chars) using Claude Haiku.
 * @param {string} keyword - Target keyword
 * @param {string} content - Article content (first 500 chars used as context)
 * @returns {Promise<string>} Meta description string
 */
export async function generateMetaDescription(keyword, content) {
  console.log(`[seo] Generating meta description for: "${keyword}"`);

  const snippet = content.slice(0, 500);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Write a meta description for an article about "${keyword}".
Context: "${snippet}"
Rules: max 160 characters, include the keyword, end with a soft CTA.
Output ONLY the meta description text — no quotes, no labels.`,
      },
    ],
  });

  const meta = response.content[0].text.trim().replace(/^["']|["']$/g, '').slice(0, 160);
  console.log(`[seo] Meta (${meta.length} chars): ${meta}`);
  return meta;
}

/**
 * Score an article's SEO readiness and return recommendations.
 * Scoring breakdown:
 *   - Keyword in title: 20 pts
 *   - Keyword in meta description: 10 pts
 *   - Optimal keyword density (0.5–2.5%): 20 pts
 *   - Word count 1,500–2,500: 20 pts
 *   - Has H2 headings: 10 pts
 *   - Has H3 headings: 10 pts
 *   - Has comparison table: 5 pts
 *   - Has internal links: 5 pts
 * @param {Object} article - Article object from generator.js
 * @returns {Promise<Object>} score, passed[], issues[], density, wordCount
 */
export async function scoreArticle(article) {
  console.log(`[seo] Scoring article: "${article.title}"`);

  const density = analyzeKeywordDensity(article.content, article.keyword);
  const keywordRoot = article.keyword.toLowerCase().split(' ')[0];

  const checks = {
    titleHasKeyword: article.title.toLowerCase().includes(keywordRoot),
    metaHasKeyword: (article.metaDescription || '').toLowerCase().includes(keywordRoot),
    densityOptimal: density.status === 'optimal',
    wordCountOk: density.wordCount >= 1500 && density.wordCount <= 2500,
    hasH2: /^## /m.test(article.content),
    hasH3: /^### /m.test(article.content),
    hasTable: /^\|.+\|/m.test(article.content),
    hasInternalLinks: /\[.+\]\(\/[^)]+\)/.test(article.content),
  };

  const scoreMap = {
    titleHasKeyword: { pts: 20, pass: 'Keyword in title', fail: 'Add target keyword to title' },
    metaHasKeyword: { pts: 10, pass: 'Keyword in meta description', fail: 'Add keyword to meta description' },
    densityOptimal: { pts: 20, pass: `Keyword density optimal (${density.density}%)`, fail: `Keyword density ${density.status} (${density.density}%) — target 0.5–2.5%` },
    wordCountOk: { pts: 20, pass: `Word count optimal (${density.wordCount})`, fail: `Word count ${density.wordCount} — target 1,500–2,500` },
    hasH2: { pts: 10, pass: 'Has H2 headings', fail: 'Add H2 headings to structure content' },
    hasH3: { pts: 10, pass: 'Has H3 subheadings', fail: 'Add H3 subheadings for depth' },
    hasTable: { pts: 5, pass: 'Has comparison/data table', fail: 'Consider adding a comparison table' },
    hasInternalLinks: { pts: 5, pass: 'Has internal links', fail: 'Add internal links to related articles' },
  };

  let score = 0;
  const passed = [];
  const issues = [];

  for (const [key, result] of Object.entries(checks)) {
    const map = scoreMap[key];
    if (result) {
      score += map.pts;
      passed.push(map.pass);
    } else {
      issues.push(map.fail);
    }
  }

  console.log(`[seo] Score: ${score}/100 — ${passed.length} passed, ${issues.length} issues`);
  return { score, passed, issues, density, wordCount: density.wordCount };
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , cmd, ...args] = process.argv;

  if (cmd === 'titles' && args.length >= 2) {
    const [tool, keyword, type = 'review'] = args;
    generateSeoTitles(keyword, tool, type)
      .then((titles) => titles.forEach((t, i) => console.log(`${i + 1}. ${t}`)))
      .catch((err) => { console.error(err.message); process.exit(1); });
  } else if (cmd === 'meta' && args.length >= 2) {
    const [keyword, ...contentParts] = args;
    generateMetaDescription(keyword, contentParts.join(' '))
      .then((meta) => console.log(meta))
      .catch((err) => { console.error(err.message); process.exit(1); });
  } else {
    console.log('Usage:');
    console.log('  node seo-optimizer.js titles "<tool>" "<keyword>" [type]');
    console.log('  node seo-optimizer.js meta "<keyword>" "<content snippet>"');
  }
}
