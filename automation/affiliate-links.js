/**
 * @fileoverview Affiliate link auto-insertion for Gamma Stream Platform.
 * Scans published post HTML and hyperlinks the first occurrence of each
 * registered keyword with its corresponding affiliate URL.
 *
 * To add a new affiliate keyword:
 *   1. Add an entry to AFFILIATE_LINKS below: "Keyword": "https://your-url"
 *   2. Longer/more-specific phrases are matched before shorter ones automatically.
 *
 * Insertion rules:
 *   - Only the FIRST occurrence of each keyword is linked (avoids over-linking).
 *   - Text already inside an <a> tag is never touched (no double-wrapping).
 *   - Matching is case-sensitive (brand names appear with correct capitalisation).
 *   - Links include rel="sponsored noopener noreferrer" (FTC + SEO compliant).
 */

// ---------------------------------------------------------------------------
// Keyword → affiliate URL mapping
// Replace placeholder URLs with real affiliate deep-links when ready.
// ---------------------------------------------------------------------------
export const AFFILIATE_LINKS = {
  'Jasper AI':     'https://gammacash.online/go/jasper',
  'Jasper':        'https://gammacash.online/go/jasper',
  'Copy.ai':       'https://gammacash.online/go/copyai',
  'ConvertKit':    'https://gammacash.online/go/convertkit',
  'Writesonic':    'https://gammacash.online/go/writesonic',
  'Surfer SEO':    'https://gammacash.online/go/surfer-seo',
  'Grammarly':     'https://gammacash.online/go/grammarly',
  'Canva':         'https://gammacash.online/go/canva',
  'ChatGPT Plus':  'https://gammacash.online/go/chatgpt-plus',
  'Midjourney':    'https://gammacash.online/go/midjourney',
  'Systeme.io':    'https://gammacash.online/go/systeme-io',
  'Zapier':        'https://gammacash.online/go/zapier',
  'Scalenut':      'https://gammacash.online/go/scalenut',
  'Notion AI':     'https://gammacash.online/go/notion',
  'Notion':        'https://gammacash.online/go/notion',
};

// ---------------------------------------------------------------------------
// Insertion logic
// ---------------------------------------------------------------------------

/**
 * Scan HTML content and hyperlink the first occurrence of each affiliate
 * keyword. Text already inside an <a> element is left untouched.
 *
 * @param {string} html - WordPress-compatible HTML string
 * @returns {string} HTML with affiliate links inserted
 */
export function insertAffiliateLinks(html) {
  // Sort keywords longest-first so "Jasper AI" matches before "Jasper"
  const keywords = Object.keys(AFFILIATE_LINKS).sort((a, b) => b.length - a.length);

  for (const keyword of keywords) {
    const url = AFFILIATE_LINKS[keyword];
    let replaced = false;

    // Split on HTML tags (capturing) so we can tell text nodes from tags.
    // Even indices → raw text; odd indices → tag strings like "<h2>", "</a>", etc.
    const parts = html.split(/(<[^>]+>)/);
    let anchorDepth = 0;

    for (let i = 0; i < parts.length && !replaced; i++) {
      if (i % 2 === 1) {
        // Track <a> nesting so we never modify text inside existing links
        if (/^<a[\s>]/i.test(parts[i]))  anchorDepth++;
        if (/^<\/a>/i.test(parts[i]))    anchorDepth = Math.max(0, anchorDepth - 1);
        continue;
      }

      // Text node outside any anchor — safe to hyperlink
      if (anchorDepth === 0) {
        const idx = parts[i].indexOf(keyword);
        if (idx !== -1) {
          const link = `<a href="${url}" target="_blank" rel="sponsored noopener noreferrer">${keyword}</a>`;
          parts[i] = parts[i].slice(0, idx) + link + parts[i].slice(idx + keyword.length);
          replaced = true;
        }
      }
    }

    if (replaced) {
      html = parts.join('');
      console.log(`[affiliate-links] Linked first occurrence of "${keyword}" → ${url}`);
    }
  }

  return html;
}
