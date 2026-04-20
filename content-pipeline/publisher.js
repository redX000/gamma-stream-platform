/**
 * @fileoverview WordPress REST API publisher for Gamma Stream Platform.
 * Handles creating, updating, and scheduling posts via the WordPress REST API.
 * Supports categories, tags, Yoast SEO meta fields, and post scheduling.
 *
 * Requires .env: WORDPRESS_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD
 *
 * Usage (import):
 *   import { publishArticle } from './publisher.js';
 *   await publishArticle(article, { status: 'publish' });
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

// Node.js 18+ has global fetch — no import needed

/**
 * Build the Base64 Basic Auth header from .env credentials.
 * WordPress Application Passwords use this auth scheme.
 * @returns {string} Authorization header value
 */
function getAuthHeader() {
  const user = process.env.WORDPRESS_USERNAME;
  const pass = process.env.WORDPRESS_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error('WORDPRESS_USERNAME and WORDPRESS_APP_PASSWORD must be set in .env');
  }
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

/**
 * Make an authenticated request to the WordPress REST API.
 * @param {string} endpoint - API endpoint path (e.g., '/wp/v2/posts')
 * @param {string} [method='GET'] - HTTP method
 * @param {Object|null} [body=null] - JSON request body
 * @returns {Promise<Object>} Parsed JSON response
 */
async function wpRequest(endpoint, method = 'GET', body = null) {
  const base = process.env.WORDPRESS_URL?.replace(/\/$/, '');
  if (!base) throw new Error('WORDPRESS_URL is not set in .env');

  const url = `${base}/wp-json${endpoint}`;
  console.log(`[publisher] ${method} ${endpoint}`);

  const options = {
    method,
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };

  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      const errorText = await res.text();
      const hint =
        res.status === 401 ? ' — check WORDPRESS_USERNAME and WORDPRESS_APP_PASSWORD secrets' :
        res.status === 403 ? ' — Application Passwords may be disabled on this WordPress install' :
        res.status === 404 ? ' — WordPress REST API not found; check WORDPRESS_URL and that REST API is enabled' : '';
      throw new Error(`WordPress API ${res.status}${hint} on ${endpoint}: ${errorText.slice(0, 300)}`);
    }

    return res.json();
  } catch (err) {
    console.error(`[publisher] Request failed: ${err.message}`);
    throw err;
  }
}

/**
 * Get or create a WordPress category by name.
 * @param {string} name - Category display name
 * @returns {Promise<number>} WordPress category ID
 */
export async function getOrCreateCategory(name) {
  console.log(`[publisher] Resolving category: "${name}"`);

  const results = await wpRequest(`/wp/v2/categories?search=${encodeURIComponent(name)}&per_page=5`);
  const existing = results.find((c) => c.name.toLowerCase() === name.toLowerCase());

  if (existing) {
    console.log(`[publisher] Found category ID ${existing.id}: ${existing.name}`);
    return existing.id;
  }

  const created = await wpRequest('/wp/v2/categories', 'POST', { name });
  console.log(`[publisher] Created category ID ${created.id}: ${created.name}`);
  return created.id;
}

/**
 * Get or create multiple WordPress tags by name.
 * @param {string[]} names - Array of tag names
 * @returns {Promise<number[]>} Array of tag IDs
 */
export async function getOrCreateTags(names) {
  console.log(`[publisher] Resolving ${names.length} tag(s)`);

  const ids = await Promise.all(
    names.map(async (name) => {
      const results = await wpRequest(`/wp/v2/tags?search=${encodeURIComponent(name)}&per_page=5`);
      const existing = results.find((t) => t.name.toLowerCase() === name.toLowerCase());
      if (existing) return existing.id;
      const created = await wpRequest('/wp/v2/tags', 'POST', { name });
      return created.id;
    })
  );

  return ids;
}

/**
 * Convert markdown to basic WordPress-compatible HTML.
 * Handles headings, bold, italic, lists, links, and paragraph breaks.
 * Note: For production, consider using the `marked` package for full spec compliance.
 * @param {string} markdown - Markdown string
 * @returns {string} HTML string
 */
export function markdownToHtml(markdown) {
  return markdown
    // Strip front matter if present
    .replace(/^---[\s\S]+?---\n+/, '')
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (match) => `<ul>\n${match}</ul>\n`)
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Horizontal rules
    .replace(/^---+$/gm, '<hr>')
    // Double newlines → paragraph breaks (for non-block elements)
    .replace(/\n\n(?!<[huo])/g, '</p><p>')
    .replace(/^(?!<[huo]|<li|<block|<hr)(.+)$/gm, (line) => line.startsWith('<') ? line : `<p>${line}</p>`);
}

/**
 * Publish an article to WordPress.
 * @param {Object} article - Article object from generator.js
 * @param {Object} [options] - Publishing options
 * @param {string} [options.status='draft'] - 'publish', 'draft', or 'future'
 * @param {string} [options.date] - ISO 8601 date string for scheduled posts
 * @param {string[]} [options.tags] - Tag names (auto-derived from article if omitted)
 * @param {string} [options.category] - Category name (auto-derived from type if omitted)
 * @returns {Promise<Object>} Created WordPress post object (id, link, status, etc.)
 */
export async function publishArticle(article, options = {}) {
  const defaultCategory = {
    review: 'Reviews',
    comparison: 'Comparisons',
    'top-list': 'Guides',
    tutorial: 'Tutorials',
  }[article.type] || 'AI Tools';

  const {
    status = 'draft',
    date = null,
    tags = ['ai tools', 'saas', article.tool?.toLowerCase()].filter(Boolean),
    category = defaultCategory,
  } = options;

  console.log(`[publisher] Publishing "${article.title}" — status: ${status}, category: ${category}`);

  // Category is non-fatal — fall back to uncategorized (ID 1) if creation fails
  let categoryId = 1;
  try {
    categoryId = await getOrCreateCategory(category);
  } catch (err) {
    console.warn(`[publisher] Category resolution failed (using Uncategorized): ${err.message}`);
  }

  // Tags are non-fatal — fall back to no tags if creation fails
  let tagIds = [];
  try {
    tagIds = await getOrCreateTags(tags);
  } catch (err) {
    console.warn(`[publisher] Tag resolution failed (publishing without tags): ${err.message}`);
  }

  const htmlContent = markdownToHtml(article.content);

  const postData = {
    title: article.title,
    content: htmlContent,
    excerpt: article.metaDescription,
    status,
    categories: [categoryId],
    tags: tagIds,
    // Yoast SEO plugin reads these meta fields if installed
    meta: {
      _yoast_wpseo_metadesc: article.metaDescription,
      _yoast_wpseo_focuskw: article.keyword,
      _yoast_wpseo_title: article.title,
    },
    ...(date && { date }),
  };

  try {
    const post = await wpRequest('/wp/v2/posts', 'POST', postData);
    console.log(`[publisher] Post created — ID: ${post.id}, URL: ${post.link}, status: ${post.status}`);
    return post;
  } catch (err) {
    console.error(`[publisher] Publish failed: ${err.message}`);
    throw err;
  }
}

/**
 * Update an existing WordPress post by ID.
 * @param {number} postId - WordPress post ID
 * @param {Object} updates - Fields to update (partial)
 * @returns {Promise<Object>} Updated post object
 */
export async function updatePost(postId, updates) {
  console.log(`[publisher] Updating post ID: ${postId}`);
  return wpRequest(`/wp/v2/posts/${postId}`, 'PUT', updates);
}

/**
 * Retrieve published posts (paginated, 10 per page).
 * @param {number} [page=1] - Page number
 * @returns {Promise<Object[]>} Array of WordPress post objects
 */
export async function getPosts(page = 1) {
  console.log(`[publisher] Fetching posts — page ${page}`);
  return wpRequest(`/wp/v2/posts?per_page=10&page=${page}&status=publish&orderby=date&order=desc`);
}

// CLI entry: node publisher.js status  (prints post counts per status)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('[publisher] Checking WordPress connection...');
  wpRequest('/wp/v2/posts?per_page=1&status=publish')
    .then(() => console.log('[publisher] WordPress connection OK'))
    .catch((err) => {
      console.error(`[publisher] Connection failed: ${err.message}`);
      process.exit(1);
    });
}
