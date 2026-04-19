/**
 * @fileoverview Main AI content generation script for Gamma Stream Platform.
 * Uses the Anthropic Claude API to generate SEO-optimized affiliate content
 * from markdown templates. Supports review, comparison, top-list, and tutorial formats.
 *
 * Usage: node generator.js <type> "<keyword>" "<tool>" [<competitor>]
 * Example: node generator.js review "best Jasper AI review" "Jasper AI"
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CONTENT_TYPES = ['review', 'comparison', 'top-list', 'tutorial'];

/**
 * Load a template file by content type.
 * @param {string} type - Content type (review, comparison, top-list, tutorial)
 * @returns {Promise<string>} Template markdown content
 */
async function loadTemplate(type) {
  console.log(`[generator] Loading template: ${type}`);
  const templatePath = path.join(__dirname, 'templates', `${type}.md`);
  try {
    return await fs.readFile(templatePath, 'utf-8');
  } catch (err) {
    throw new Error(`Template not found for type "${type}": ${err.message}`);
  }
}

/**
 * Generate article content using Claude API with prompt caching for the system prompt.
 * @param {Object} options - Generation options
 * @param {string} options.type - Content type (review, comparison, top-list, tutorial)
 * @param {string} options.keyword - Target SEO keyword
 * @param {string} options.tool - Primary AI tool being covered
 * @param {string} [options.competitor] - Competitor tool for comparison articles
 * @returns {Promise<Object>} Generated article with title, content, meta, and stats
 */
export async function generateArticle({ type, keyword, tool, competitor = null }) {
  console.log(`[generator] Starting generation — type: ${type}, keyword: "${keyword}", tool: "${tool}"`);

  if (!CONTENT_TYPES.includes(type)) {
    throw new Error(`Invalid content type "${type}". Must be one of: ${CONTENT_TYPES.join(', ')}`);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set in .env');
  }

  const template = await loadTemplate(type);

  // System prompt is cached — saves cost on repeated daily runs
  const systemPrompt = `You are an expert AI tools content writer for an affiliate marketing blog in the AI & SaaS niche.
Your job is to write SEO-optimized, engaging, and genuinely helpful content that ranks on Google and converts readers into buyers through affiliate links.

Rules:
- Write 1,500–2,500 words
- Use the provided template structure exactly, replacing all [PLACEHOLDER] tokens
- Include the target keyword naturally 3–5 times throughout the article
- Write in a conversational but authoritative tone
- Include specific, accurate details about the tools (features, pricing, pros/cons)
- Add affiliate CTAs naturally at the end without being salesy
- Format with proper markdown: H2, H3, bullet points, tables where relevant
- Include a clear conclusion with a recommendation`;

  const userPrompt = `Write a ${type} article using the following:
- Target keyword: "${keyword}"
- Primary tool: ${tool}
${competitor ? `- Competitor tool: ${competitor}` : ''}

Template to follow:
${template}

Replace every [PLACEHOLDER] with real, accurate content about ${tool}${competitor ? ` vs ${competitor}` : ''}.
Output ONLY the article in markdown — no preamble, no meta commentary.`;

  console.log(`[generator] Calling Claude API (claude-sonnet-4-6)...`);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          // Cache the system prompt — reduces cost on repeated daily pipeline runs
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0].text;
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    console.log(`[generator] Generated ${wordCount} words`);

    // Extract H1 title from the generated article
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `${keyword} — Complete Guide`;

    // Build meta description from the first non-heading paragraph
    const firstPara = content.replace(/^#.+\n+/, '').match(/^(?!#)[^\n].+/m);
    const metaDescription = firstPara
      ? firstPara[0].slice(0, 157).replace(/\s\w+$/, '...')
      : `Complete guide to ${keyword}. Reviews, pricing, and expert recommendations.`;

    return {
      title,
      content,
      metaDescription,
      keyword,
      type,
      tool,
      competitor: competitor || null,
      generatedAt: new Date().toISOString(),
      wordCount,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
    };
  } catch (err) {
    console.error(`[generator] Claude API error: ${err.message}`);
    throw err;
  }
}

/**
 * Save a generated article to disk with YAML front matter.
 * @param {Object} article - Article object from generateArticle()
 * @param {string} [outputDir] - Directory to save the file (default: ./generated)
 * @returns {Promise<string>} Absolute path to the saved file
 */
export async function saveArticle(article, outputDir = path.join(__dirname, 'generated')) {
  await fs.mkdir(outputDir, { recursive: true });

  // Build URL-safe slug from the title
  const slug = article.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const filePath = path.join(outputDir, `${slug}.md`);

  const frontmatter = `---
title: "${article.title.replace(/"/g, '\\"')}"
keyword: "${article.keyword}"
type: "${article.type}"
tool: "${article.tool}"
${article.competitor ? `competitor: "${article.competitor}"\n` : ''}metaDescription: "${article.metaDescription.replace(/"/g, '\\"')}"
generatedAt: "${article.generatedAt}"
wordCount: ${article.wordCount}
status: draft
---

`;

  await fs.writeFile(filePath, frontmatter + article.content, 'utf-8');
  console.log(`[generator] Article saved: ${filePath}`);
  return filePath;
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , type, keyword, tool, competitor] = process.argv;

  if (!type || !keyword || !tool) {
    console.error('Usage: node generator.js <type> "<keyword>" "<tool>" [<competitor>]');
    console.error('Types: review | comparison | top-list | tutorial');
    process.exit(1);
  }

  generateArticle({ type, keyword, tool, competitor: competitor || null })
    .then((article) => saveArticle(article))
    .then((savedPath) => console.log(`[generator] Done → ${savedPath}`))
    .catch((err) => {
      console.error(`[generator] Fatal: ${err.message}`);
      process.exit(1);
    });
}
