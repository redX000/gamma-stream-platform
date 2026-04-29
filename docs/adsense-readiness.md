# Google AdSense — Pre-Flight Checklist

## Threshold to Apply
Apply only after ALL of the following are true:

- [ ] **10+ published posts** (quality, original, 600+ words each)
- [ ] **Privacy Policy page** exists at `/privacy-policy`
- [ ] **About page** exists at `/about`
- [ ] **Contact page** exists at `/contact`
- [ ] **Affiliate Disclosure page** exists at `/affiliate-disclosure`
- [ ] Site is indexed by Google (check Search Console)
- [ ] No "Hello World" or placeholder content published
- [ ] Site is live for at least 2–4 weeks (informal guideline)

The `adsense-readiness-check` GitHub Actions workflow runs daily at 07:00 UTC and emails
you automatically when all criteria are met. You do not need to monitor this manually.

---

## How to Apply

1. Go to: https://www.google.com/adsense/start/
2. Sign in with the **Moroccan operator's Google account** (family member's account)
3. Enter site URL: `https://gammacash.online`
4. Select language: **English**
5. Enter Moroccan name and address (must match government ID for payment verification)
6. Submit and wait **1–14 days** for review

---

## After Approval

### Add Auto-Ads Tag

Option A — via WordPress Site Kit plugin (easiest):
1. WP Admin → Site Kit → Settings → Connect Google AdSense
2. Site Kit installs the tag automatically

Option B — via Additional CSS / header injection:
1. Copy your auto-ads snippet from AdSense → Ads → Overview → Get code
2. Add to WP Admin → Appearance → Customize → Additional CSS
   OR paste into the `<head>` via your theme's `functions.php`

Option C — via GitHub Secrets + code:
1. Add `ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXXXX` to `.env` and GitHub Secrets
2. The site-upgrade.js script can inject the tag into the FSE footer template part

### Payment Setup

AdSense supports two payout methods for Morocco:

| Method | Notes |
|--------|-------|
| **Wire transfer to Moroccan bank** | MAD account, possible conversion fees |
| **Payoneer** | Preferred — select "International wire" in AdSense Payments settings, use Payoneer's USD virtual account routing/account numbers |

Minimum payout threshold: **$100 USD** (can lower to $10 in settings after first payment)

---

## Revenue Expectations

| Monthly Page Views | Est. RPM | Monthly Revenue |
|--------------------|----------|-----------------|
| 1,000 | $3–$8 | $3–$8 |
| 5,000 | $3–$8 | $15–$40 |
| 20,000 | $4–$10 | $80–$200 |
| 100,000 | $5–$15 | $500–$1,500 |

RPM varies heavily by niche. AI tools content typically earns $5–$15 RPM.

---

## Secrets Required

```
ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXXXX
```

Add to: `.env` (local) + GitHub Secrets (CI/CD)

---

## Related Files

- `.github/workflows/adsense-readiness-check.yml` — daily monitor, auto-notifies when ready
- `scripts/adsense-checker.js` — manual check: `npm run adsense-check`
- `.env.example` — template with `ADSENSE_PUBLISHER_ID` placeholder
