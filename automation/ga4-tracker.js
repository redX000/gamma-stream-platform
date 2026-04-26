/**
 * @fileoverview GA4 Measurement Protocol event tracker for Gamma Stream Platform.
 * Fires server-side events to GA4 from GitHub Actions (e.g. post_published).
 *
 * Uses the GA4 Measurement Protocol v2 — no service account needed, only:
 *   GA4_MEASUREMENT_ID  — the G-XXXXXXXXXX ID from GA4 Admin > Data Streams
 *   GA4_API_SECRET      — from GA4 Admin > Data Streams > Measurement Protocol API secrets
 *
 * Requires env: GA4_MEASUREMENT_ID, GA4_API_SECRET
 */

import dotenv from 'dotenv';

dotenv.config();

const MP_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

// Stable client ID for server-side events — not a real browser session
const SERVER_CLIENT_ID = 'gamma-stream-server-001';

/**
 * Send a single event to GA4 via the Measurement Protocol.
 * Non-fatal: logs a warning and returns null if credentials are missing or the call fails.
 *
 * @param {string} eventName - GA4 event name (snake_case, max 40 chars)
 * @param {Object} [params={}] - Event parameters (string/number values, max 25 params)
 * @returns {Promise<boolean>} true if the event was accepted, false otherwise
 */
export async function trackEvent(eventName, params = {}) {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;

  if (!measurementId || !apiSecret) {
    console.warn('[ga4] GA4_MEASUREMENT_ID or GA4_API_SECRET not set — skipping event tracking');
    return false;
  }

  const { default: fetch } = await import('node-fetch');

  const payload = {
    client_id: SERVER_CLIENT_ID,
    events: [{
      name: eventName,
      params: {
        engagement_time_msec: 1,
        ...params,
      },
    }],
  };

  const url = `${MP_ENDPOINT}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // GA4 Measurement Protocol returns 204 No Content on success
    if (res.status === 204 || res.ok) {
      console.log(`[ga4] Event tracked: ${eventName}`);
      return true;
    }

    const body = await res.text();
    console.warn(`[ga4] Event tracking failed ${res.status}: ${body.slice(0, 150)}`);
    return false;
  } catch (err) {
    console.warn(`[ga4] Event tracking error (non-fatal): ${err.message}`);
    return false;
  }
}

/**
 * Fire a post_published event after a WordPress post is created.
 * Captures post ID, title, URL, content type, and word count for GA4 reporting.
 *
 * @param {Object} post - WordPress REST API post object (from publisher.js)
 * @param {Object} [article] - Original article object from generator.js (optional extra context)
 * @returns {Promise<boolean>}
 */
export async function trackPostPublished(post, article = {}) {
  const title = (post.title?.rendered || post.title || article.title || '')
    .replace(/&#8211;/g, '—')
    .replace(/&amp;/g, '&')
    .slice(0, 100);

  return trackEvent('post_published', {
    post_id: String(post.id || ''),
    post_title: title,
    post_url: (post.link || '').slice(0, 100),
    post_status: post.status || 'publish',
    content_type: article.type || 'unknown',
    keyword: (article.keyword || '').slice(0, 50),
  });
}
