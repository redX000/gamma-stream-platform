# Gamma Stream Platform — Setup Guide

Complete step-by-step guide to deploying the Gamma Stream Platform from scratch.

---

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] GitHub account ready
- [ ] Claude Code installed (`npm install -g @anthropic-ai/claude-code`)
- [ ] Anthropic API key from console.anthropic.com
- [ ] Domain purchased (~$15/year from Namecheap)
- [ ] Hosting set up (WordPress.com Business OR self-hosted)

---

## Step 1 — Clone & Configure Repo

```bash
git clone https://github.com/YOUR_USERNAME/gamma-stream-platform.git
cd gamma-stream-platform
npm install
cp .env.example .env
```

Open `.env` and fill in your keys (see Environment Variables section below).

---

## Step 2 — Set Up WordPress Site

1. Install WordPress on your hosting
2. Install required plugins (see `site/plugins.md`)
3. Generate an Application Password:
   - WordPress Admin → Users → Profile → Application Passwords
   - Name it "Gamma Stream API"
   - Copy the password into your `.env`

---

## Step 3 — Set Up ConvertKit

1. Sign up at convertkit.com (free up to 1,000 subscribers)
2. Create a new Form called "Gamma Stream Lead Magnet"
3. Copy your API key to `.env`
4. Create a Sequence called "Gamma Stream Welcome" (emails in `/automation/email-sequences/`)

---

## Step 4 — Set Up Affiliate Programs

Sign up for these programs in order of priority:

| Priority | Program | URL | Commission |
|---|---|---|---|
| 1 | Systeme.io | systeme.io/affiliate | 60% recurring |
| 2 | Copy.ai | copy.ai/affiliate | 45% recurring |
| 3 | Scalenut | scalenut.com/affiliate | 30% lifetime |
| 4 | ConvertKit | convertkit.com/affiliate | 30% recurring |
| 5 | Jasper AI | jasper.ai/affiliate | 25% recurring |
| 6 | Surfer SEO | surferseo.com/affiliate | 25% recurring |

Add your affiliate links to `automation/affiliate-tracker.js` once approved.

---

## Step 5 — Connect GitHub Actions

```bash
# Inside Claude Code terminal:
claude
/install-github-app
```

Follow the prompts to connect your GitHub repo.

Then add these secrets to your GitHub repo (Settings → Secrets → Actions):

```
ANTHROPIC_API_KEY
WORDPRESS_URL
WORDPRESS_USERNAME
WORDPRESS_APP_PASSWORD
CONVERTKIT_API_KEY
GA4_MEASUREMENT_ID
REDDIT_CLIENT_ID
REDDIT_SECRET
PINTEREST_ACCESS_TOKEN
```

---

## Step 6 — Set Up Reddit & Pinterest Automation

**Reddit:**
1. Go to reddit.com/prefs/apps
2. Create a new app (type: script)
3. Copy Client ID and Secret to `.env`
4. Target subreddits: r/artificial, r/SaaS, r/blogging, r/passive_income

**Pinterest:**
1. Go to developers.pinterest.com
2. Create a new app
3. Generate an access token
4. Copy to `.env`

---

## Step 7 — Enable GitHub Actions

1. Go to your repo → Actions tab
2. Enable workflows
3. Test each workflow manually first:
   - Run `content-generation.yml` manually → verify article published
   - Run `social-posting.yml` manually → verify posts appear
   - Run `analytics-report.yml` manually → verify email received

---

## Step 8 — Set Up Google Analytics

1. Go to analytics.google.com
2. Create a new GA4 property
3. Copy Measurement ID to `.env`
4. Add GA4 snippet to WordPress theme or via plugin

---

## Step 9 — Install Display Ads (Month 3+)

1. Apply for Google AdSense at google.com/adsense
2. Add site and wait for approval (usually 1–2 weeks)
3. Add AdSense code to WordPress (via plugin or theme)
4. At 50,000 sessions/month → apply for Mediavine (4–6x RPM)

---

## Step 10 — Launch

```bash
# Push everything to GitHub
git add .
git commit -m "chore: initial Gamma Stream Platform setup"
git push origin main

# Start Claude Code
claude

# Tell Claude Code to run Phase 2 build
# > "Build the content pipeline — generator.js, templates, SEO optimizer, and publisher"
```

---

## Environment Variables Reference

```env
# Anthropic (content generation)
ANTHROPIC_API_KEY=sk-ant-...

# WordPress (content publishing)
WORDPRESS_URL=https://yourdomain.com
WORDPRESS_USERNAME=admin
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx

# Email (ConvertKit)
CONVERTKIT_API_KEY=...
CONVERTKIT_FORM_ID=...

# Analytics
GA4_MEASUREMENT_ID=G-XXXXXXXXXX

# Reddit automation
REDDIT_CLIENT_ID=...
REDDIT_SECRET=...
REDDIT_USERNAME=...
REDDIT_PASSWORD=...

# Pinterest automation
PINTEREST_ACCESS_TOKEN=...
PINTEREST_BOARD_ID=...

# Notifications
NOTIFICATION_EMAIL=your@email.com
```

---

## Troubleshooting

**Content not publishing?**
- Check WordPress Application Password is correct
- Check `WORDPRESS_URL` has no trailing slash
- Check the GitHub Action logs for error details

**GitHub Actions failing?**
- Verify all secrets are added to GitHub repo settings
- Check the workflow `.yml` files for syntax errors
- Run `claude` and ask: "Debug the failing GitHub Action"

**Affiliate links not tracking?**
- Verify Pretty Links plugin is installed and active
- Check affiliate program dashboards for approval status

---

## Support

Use Claude Code for any issues:
```bash
claude
# > "The content pipeline is failing with this error: [paste error]"
# Claude Code will diagnose and fix it automatically
```
