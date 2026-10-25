# domicircles.com

A Cloudflare Worker (free plan) that serves:

- `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`, which iPhones and Android phones check before opening `https://domicircles.com/c/…` and `/i/…` links in the app.
- `/c/<code>`: the invite page (circle, inviter, code to copy) for people without the app.
- `/i/<code>`: the read-only page for a listing shared outside Domi.
- `/p/<code>`: that listing's photo (used by the page and its link preview), served from Cloudflare's cache so repeat views don't download it from Convex. Each request still checks the listing is available.

It reads from the public Convex queries `invites:preview` and `shares:preview`.

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
