/**
 * @fileoverview Social media poster for Gamma Stream Platform.
 * Fetches the latest published WordPress article and posts it to Reddit
 * and/or Pinterest using their respective APIs.
 *
 * Reddit: uses snoowrap (OAuth2 script-app flow)
 * Pinterest: uses Pinterest API v5 (pin creation endpoint)
 *
 * Usage:
 *   node social-poster.js --platform reddit
 *   node social-poster.js --platform pinterest
 *   node social-poster.js --platform all
 *
 * Requires .env: WORDPRESS_URL, REDDIT_CLIENT_ID, REDDIT_SECRET,
 *   REDDIT_USERNAME, REDDIT_PASSWORD, REDDIT_USER_AGENT,
 *   PINTEREST_ACCESS_TOKEN, PINTEREST_BOARD_ID
 */

import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Map content types and keywords to the most relevant subreddits
const SUBREDDIT_MAP = {
  review:     ['artificial', 'AItools', 'SaaS'],
  comparison: ['artificial', 'AItools', 'productivity'],
  'top-list': ['artificial', 'AItools', 'Entrepreneur'],
  tutorial:   ['artificial', 'ChatGPT', 'learnmachinelearning'],
  default:    ['artificial', 'AItools'],
};

// Reddit post title templates by content type
const REDDIT_TITLE_TEMPLATES = {
  review:     (title) => `Review: ${title}`,
  comparison: (title) => `${title} — honest comparison`,
  'top-list': (title) => title,
  tutorial:   (title) => `[Tutorial] ${title}`,
  default:    (title) => title,
};

/**
 * Fetch the most recently published WordPress post via REST API.
 * @returns {Promise<Object>} WordPress post object with id, title, link, excerpt, meta
 */
async function getLatestArticle() {
  const base = process.env.WORDPRESS_URL?.replace(/\/$/, '');
  if (!base) throw new Error('WORDPRESS_URL is not set in .env');

  console.log('[social] Fetching latest published article from WordPress...');

  const { default: fetch } = await import('node-fetch');
  const res = await fetch(
    `${base}/wp-json/wp/v2/posts?per_page=1&status=publish&orderby=date&order=desc`,
    { headers: { Accept: 'application/json' } }
  );

  if (!res.ok) throw new Error(`WordPress API error ${res.status}`);

  const posts = await res.json();
  if (!posts.length) throw new Error('No published posts found on WordPress');

  const post = posts[0];
  console.log(`[social] Latest article: "${post.title.rendered}" — ${post.link}`);
  return {
    id: post.id,
    title: post.title.rendered.replace(/&#8211;/g, '—').replace(/&amp;/g, '&'),
    url: post.link,
    excerpt: post.excerpt?.rendered?.replace(/<[^>]+>/g, '').trim().slice(0, 300) || '',
    // WordPress REST API stores type in categories — fall back to 'default'
    type: post.meta?._content_type || 'default',
    featuredImageUrl: post.jetpack_featured_media_url || post._links?.['wp:featuredmedia']?.[0]?.href || null,
  };
}

/**
 * Post the article as a link submission to Reddit.
 * Picks the first matching subreddit from SUBREDDIT_MAP for the content type.
 * Falls back to r/artificial if snoowrap is unavailable.
 * @param {Object} article - Article object from getLatestArticle()
 * @returns {Promise<Object>} Result with subreddit and post URL
 */
export async function postToReddit(article) {
  const requiredVars = ['REDDIT_CLIENT_ID', 'REDDIT_SECRET', 'REDDIT_USERNAME', 'REDDIT_PASSWORD', 'REDDIT_USER_AGENT'];
  for (const v of requiredVars) {
    if (!process.env[v]) throw new Error(`${v} is not set in .env`);
  }

  console.log('[social] Connecting to Reddit via snoowrap...');

  let snoowrap;
  try {
    // Dynamic import — snoowrap is an optional dependency
    const mod = await import('snoowrap');
    snoowrap = mod.default || mod;
  } catch {
    throw new Error('snoowrap not installed. Run: npm install snoowrap');
  }

  const r = new snoowrap({
    userAgent: process.env.REDDIT_USER_AGENT,
    clientId: process.env.REDDIT_CLIENT_ID,
    clientSecret: process.env.REDDIT_SECRET,
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD,
  });

  // Pick subreddit based on content type, default to first in list
  const subreddits = SUBREDDIT_MAP[article.type] || SUBREDDIT_MAP.default;
  const targetSubreddit = subreddits[0];

  // Build Reddit title from template
  const titleFn = REDDIT_TITLE_TEMPLATES[article.type] || REDDIT_TITLE_TEMPLATES.default;
  const redditTitle = titleFn(article.title).slice(0, 300); // Reddit title max 300 chars

  console.log(`[social] Submitting to r/${targetSubreddit}: "${redditTitle}"`);

  try {
    const submission = await r.getSubreddit(targetSubreddit).submitLink({
      title: redditTitle,
      url: article.url,
      // Resubmit allowed — avoids silent failure on duplicate URL
      resubmit: true,
      sendReplies: false,
    });

    const postUrl = `https://reddit.com${submission.permalink}`;
    console.log(`[social] Reddit post created: ${postUrl}`);
    return { platform: 'reddit', subreddit: targetSubreddit, postUrl, title: redditTitle };
  } catch (err) {
    console.error(`[social] Reddit submit failed: ${err.message}`);
    throw err;
  }
}

/**
 * Exchange a Pinterest refresh token for a fresh access token.
 * Refresh tokens are valid for 365 days; access tokens expire in 30 days.
 * Uses Pinterest OAuth2 v5 token endpoint with HTTP Basic auth (app_id:app_secret).
 * @returns {Promise<string>} Fresh access token
 */
async function getPinterestAccessToken() {
  const appId = process.env.PINTEREST_APP_ID;
  const appSecret = process.env.PINTEREST_APP_SECRET;
  const refreshToken = process.env.PINTEREST_REFRESH_TOKEN;

  if (!appId) throw new Error('PINTEREST_APP_ID is not set in environment');
  if (!appSecret) throw new Error('PINTEREST_APP_SECRET is not set in environment');
  if (!refreshToken) throw new Error('PINTEREST_REFRESH_TOKEN is not set in environment');

  console.log('[social] Refreshing Pinterest access token...');

  const { default: fetch } = await import('node-fetch');

  const credentials = Buffer.from(`${appId}:${appSecret}`).toString('base64');
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });

  const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinterest token refresh failed ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.access_token) throw new Error('Pinterest token response missing access_token');

  console.log('[social] Pinterest access token refreshed successfully');
  return data.access_token;
}

/**
 * Create a Pinterest pin linking to the article.
 * Uses Pinterest API v5 POST /v5/pins endpoint.
 * Authenticates via OAuth2 refresh token flow (PINTEREST_APP_ID + PINTEREST_APP_SECRET + PINTEREST_REFRESH_TOKEN).
 * @param {Object} article - Article object from getLatestArticle()
 * @returns {Promise<Object>} Result with pin ID and URL
 */
export async function postToPinterest(article) {
  if (!process.env.PINTEREST_BOARD_ID) throw new Error('PINTEREST_BOARD_ID is not set in .env');

  const accessToken = await getPinterestAccessToken();

  console.log('[social] Creating Pinterest pin...');

  const { default: fetch } = await import('node-fetch');

  // Build pin description from excerpt, truncated to 500 chars (Pinterest limit)
  const description = article.excerpt
    ? `${article.excerpt.slice(0, 450)}... Read more →`
    : `${article.title} — Check out the full guide!`;

  const pinBody = {
    board_id: process.env.PINTEREST_BOARD_ID,
    title: article.title.slice(0, 100), // Pinterest title max 100 chars
    description: description.slice(0, 500),
    link: article.url,
    media_source: article.featuredImageUrl
      ? { source_type: 'image_url', url: article.featuredImageUrl }
      // Fallback: use web page scrape mode if no featured image
      : { source_type: 'image_url', url: `${process.env.WORDPRESS_URL}/wp-content/uploads/og-default.jpg` },
  };

  try {
    const res = await fetch('https://api.pinterest.com/v5/pins', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pinBody),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pinterest API ${res.status}: ${err.slice(0, 200)}`);
    }

    const pin = await res.json();
    const pinUrl = `https://pinterest.com/pin/${pin.id}`;
    console.log(`[social] Pinterest pin created: ${pinUrl}`);
    return { platform: 'pinterest', pinId: pin.id, pinUrl, boardId: process.env.PINTEREST_BOARD_ID };
  } catch (err) {
    console.error(`[social] Pinterest pin failed: ${err.message}`);
    throw err;
  }
}

/**
 * Run the social posting pipeline for the specified platform(s).
 * @param {string} platform - 'reddit', 'pinterest', or 'all'
 * @returns {Promise<Object[]>} Array of results from each platform
 */
export async function runSocialPoster(platform = 'all') {
  console.log(`[social] Starting social poster — platform: ${platform}`);

  const article = await getLatestArticle();
  const results = [];

  if (platform === 'reddit' || platform === 'all') {
    try {
      const result = await postToReddit(article);
      results.push(result);
    } catch (err) {
      console.error(`[social] Reddit failed (non-fatal): ${err.message}`);
      results.push({ platform: 'reddit', error: err.message });
    }
  }

  if (platform === 'pinterest' || platform === 'all') {
    try {
      const result = await postToPinterest(article);
      results.push(result);
    } catch (err) {
      console.error(`[social] Pinterest failed (non-fatal): ${err.message}`);
      results.push({ platform: 'pinterest', error: err.message });
    }
  }

  console.log('[social] Done:', JSON.stringify(results, null, 2));
  return results;
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const platformArg = process.argv.indexOf('--platform');
  const platform = platformArg !== -1 ? process.argv[platformArg + 1] : 'all';

  if (!['reddit', 'pinterest', 'all'].includes(platform)) {
    console.error('Usage: node social-poster.js --platform <reddit|pinterest|all>');
    process.exit(1);
  }

  runSocialPoster(platform)
    .then((results) => {
      const failed = results.filter((r) => r.error);
      process.exit(failed.length === results.length ? 1 : 0);
    })
    .catch((err) => {
      console.error(`[social] Fatal: ${err.message}`);
      process.exit(1);
    });
}
