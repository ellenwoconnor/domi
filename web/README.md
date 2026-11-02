# domicircles.com

A Cloudflare Worker (free plan) that serves:

- `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`, which iPhones and Android phones check before opening `https://domicircles.com/c/…` and `/i/…` links in the app.
- `/c/<code>`: the invite page (circle, inviter, code to copy) for people without the app.
- `/i/<code>`: the read-only page for a listing shared outside Domi.
- `/p/<code>`: that listing's photo (used by the page and its link preview), served from Cloudflare's cache so repeat views don't download it from Convex. Each request still checks the listing is available.

- `/`: the home page (`src/home.js`, from the landing page design canvas), and `/og.png`, its link-preview image (`src/og-image.js`), also used by pages without a photo of their own.
- `/terms` and `/privacy`: the Terms of Service and Privacy Policy the app links to (text in `src/legal.js`).
- `/beta`: what the TestFlight test version is and how to install it. Invite and listing pages show the same three steps. The TestFlight public link is `TESTFLIGHT_URL` in `wrangler.toml`; while it's empty, the pages say to ask the inviter for it.
- `/support` (and `/help`): the help page and FAQ. Answers live in `src/faq.json`, which the support agent (`support-agent/`) also reads; `src/support.js` lays out the page.

It reads from the public Convex queries `invites:preview` and `shares:preview`.

`POST /internal/report-alert` (`src/alerts.js`) emails the developer when someone files a report in the app. Convex's `moderation:sendReportAlert` calls it with a shared secret.

## Report alerts setup

1. Cloudflare dashboard → domicircles.com → Email → Email Routing: make sure it's on and the address you want alerts at is a **verified destination address** (it already is if support@ forwards there).
2. Pick a long random secret (`openssl rand -hex 32`), then:
   ```sh
   cd web
   npx wrangler secret put REPORT_ALERT_SECRET   # paste the secret
   npx wrangler secret put REPORT_ALERT_TO       # your verified address
   npx wrangler deploy
   cd ..
   npx convex env set --prod REPORT_ALERT_URL https://domicircles.com/internal/report-alert
   npx convex env set --prod REPORT_ALERT_SECRET <same secret>
   ```
3. Test: report something in the app; the email arrives within a minute. If not, check `npx convex logs --prod` for "Report alert failed".

## One-time setup

1. Add `domicircles.com` to Cloudflare (free plan). Cloudflare shows two nameservers.
2. In Squarespace Domains → domicircles.com → DNS → Nameservers, switch to custom nameservers and enter Cloudflare's two. Wait until Cloudflare says the site is active (minutes to a few hours).
3. Put your Convex URL in `wrangler.toml` (`CONVEX_URL`, same value as `EXPO_PUBLIC_CONVEX_URL` in `.env.local`).
4. Deploy:
   ```sh
   cd web
   npx wrangler login
   npx wrangler deploy
   ```
   The `custom_domain` route attaches the Worker to domicircles.com and creates the DNS record.
5. Check: `curl https://domicircles.com/.well-known/apple-app-site-association`

Tests: `npm run test:web` from the repo root.
