/**
 * @fileoverview Verifies GA4 Data API credentials and fetches yesterday's pageviews.
 * Run this after setting GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON in .env.
 *
 * Usage:
 *   node scripts/test-ga4.js
 */

import 'dotenv/config';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

const PROPERTY_ID          = process.env.GA4_PROPERTY_ID;
const SERVICE_ACCOUNT_JSON = process.env.GA4_SERVICE_ACCOUNT_JSON;

async function run() {
  if (!PROPERTY_ID) {
    console.error('[ga4-test] GA4_PROPERTY_ID not set in .env'); process.exit(1);
  }
  if (!SERVICE_ACCOUNT_JSON) {
    console.error('[ga4-test] GA4_SERVICE_ACCOUNT_JSON not set in .env'); process.exit(1);
  }

  let credentials;
  try {
    credentials = JSON.parse(SERVICE_ACCOUNT_JSON);
  } catch {
    console.error('[ga4-test] GA4_SERVICE_ACCOUNT_JSON is not valid JSON'); process.exit(1);
  }

  const client = new BetaAnalyticsDataClient({ credentials });

  console.log(`[ga4-test] Querying property ${PROPERTY_ID} …`);

  const [response] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'sessions' },
      { name: 'activeUsers' },
    ],
    dimensions: [{ name: 'date' }],
  });

  const row = response.rows?.[0];
  if (!row) {
    console.log('[ga4-test] ✅ Connection OK — no data yet for yesterday (site may be new)');
    return;
  }

  const [pageviews, sessions, users] = row.metricValues.map(v => v.value);
  console.log('[ga4-test] ✅ GA4 connection confirmed');
  console.log(`[ga4-test] Yesterday (${row.dimensionValues[0].value}):`);
  console.log(`  Pageviews : ${pageviews}`);
  console.log(`  Sessions  : ${sessions}`);
  console.log(`  Users     : ${users}`);
}

run().catch(err => {
  console.error('[ga4-test] ❌ Failed:', err.message);
  process.exit(1);
});
