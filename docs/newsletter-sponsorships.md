# Newsletter Sponsorships — Activation Guide

Three stacked monetization layers for the GammaCash email list, activated at subscriber thresholds.

---

## Layer 1 — SparkLoop Upscribe (activate at 500 subscribers)

**What it is:** A referral widget shown to new subscribers after they confirm their email.
Partner newsletters pay GammaCash $1–$5 each time one of our subscribers also subscribes to them.

**How it works:**
1. New subscriber confirms email → redirected to `/newsletter-confirmed`
2. SparkLoop Upscribe widget shows 3–5 curated newsletter recommendations
3. If the subscriber joins a recommended newsletter → GammaCash earns a referral fee

**Activation steps:**

1. Apply at https://sparkloop.app (free, takes 2–5 business days)
   - Apply in the **Moroccan operator's name**
   - Site: https://gammacash.online
   - Niche: AI tools / SaaS productivity

2. After approval, add to GitHub Secrets:
   ```
   SPARKLOOP_API_KEY=
   SPARKLOOP_PARTNER_ID=
   ```

3. Create `/newsletter-confirmed` page in WordPress:
   - Copy `scripts/sparkloop-widget.html`
   - Replace `SPARKLOOP_PARTNER_ID` with your real ID
   - Page title: "You're in! 🎉 One more thing..."

4. In ConvertKit → Forms → [your form] → Settings → Redirect URL:
   ```
   https://gammacash.online/newsletter-confirmed
   ```

**Revenue projection:**
| Subscribers | Referral Rate | Monthly Revenue |
|-------------|---------------|-----------------|
| 500 | 10% | $5–$25/mo |
| 1,000 | 10% | $10–$50/mo |
| 5,000 | 8% | $40–$200/mo |

**Payout:** SparkLoop pays via PayPal. Route: PayPal Morocco → sweep to Payoneer USD.

---

## Layer 2 — Paved Sponsorships (activate at 1,000 subscribers)

**What it is:** A sponsorship marketplace where brands pay directly to be featured in your newsletter.
CPM model: you earn per 1,000 subscribers reached per send.

**Activation steps:**

1. Apply at https://paved.com (publishers tab)
   - Audience size: current subscriber count
   - Niche: AI tools / SaaS / productivity
   - Expected CPM: $25–$60

2. After approval:
   - Paved matches you with relevant sponsors automatically
   - You approve or decline each sponsor before sending
   - Use `templates/sponsored-email.md` for FTC-compliant email structure

3. Payout: US ACH → Payoneer USD virtual account
   - In Paved payment settings, use Payoneer's "US Payment Service" virtual account details
   - Payoneer provides routing + account numbers that accept US ACH

**Revenue projection:**
| Subscribers | CPM | Sends/Month | Monthly Revenue |
|-------------|-----|-------------|-----------------|
| 1,000 | $30 | 4 | $120/mo |
| 2,500 | $35 | 4 | $350/mo |
| 5,000 | $40 | 4 | $800/mo |

---

## Layer 3 — Beehiiv Boosts (activate at 1,000 subscribers)

**What it is:** Other newsletter operators pay you per new subscriber you send them via a boost widget.
This runs alongside (or instead of) SparkLoop — both can be active simultaneously.

**Activation steps:**

1. Option A — Stay on ConvertKit + add Beehiiv Boosts via their API
2. Option B — Migrate list to Beehiiv (unlocks native Boost integration)
   - Beehiiv free plan supports up to 2,500 subscribers
   - Migration: export from ConvertKit → import to Beehiiv

3. Apply for Beehiiv Boosts at https://beehiiv.com → Grow → Boosts → Get Boosted

4. Add Boost widget to `/newsletter-confirmed` page alongside SparkLoop widget

**Revenue:** $1–$3 per boost subscriber × conversion volume

---

## Automation

The `.github/workflows/subscriber-milestone.yml` workflow:
- Runs daily at 08:00 UTC
- Checks ConvertKit subscriber count via API
- Sends notification email when count crosses **500** (SparkLoop alert)
- Sends notification email when count crosses **1,000** (Paved + Beehiiv alert)

No manual monitoring required — the system notifies you at the right time.

---

## Secrets Required

```
# SparkLoop
SPARKLOOP_API_KEY=
SPARKLOOP_PARTNER_ID=
CONVERTKIT_FORM_ID=

# ConvertKit (already set)
CONVERTKIT_API_KEY=
```

Add all to: `.env` (local) + GitHub Secrets (CI/CD)

---

## Related Files

- `scripts/sparkloop-widget.html` — Upscribe embed snippet (paste into /newsletter-confirmed)
- `templates/sponsored-email.md` — FTC-compliant sponsored email template
- `.github/workflows/subscriber-milestone.yml` — milestone monitor + auto-notifications
- `automation/convertkit-setup.js` — ConvertKit form + landing page setup
