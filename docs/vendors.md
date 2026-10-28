# Vendors, IDs, and costs

Last updated 2026-10-21. Prices checked that day; recheck before relying on them.

## Vendors

| Vendor | Used for | Plan today | Cost |
| --- | --- | --- | --- |
| **Apple Developer Program** | iOS builds and distribution, TestFlight, App Store, Sign in with Apple, push (APNs) | Individual membership | $99/year |
| **Google Cloud (Google Auth Platform)** | "Sign in with Google" OAuth clients | Free | $0 |
| **Google Play Console** | Android distribution (not set up yet) | — | $25 one-time, when needed |
| **Convex** | Backend: database, functions, live queries, file storage (photos), crons, auth (Convex Auth) | Free | $0 (see "Watch") |
| **Expo / EAS** | Cloud builds (EAS Build), store submission (EAS Submit), over-the-air updates (EAS Update), push delivery (Expo push service) | Free | $0 |
| **Cloudflare** | DNS for domicircles.com; the website Worker (`web/`): app-link files, invite and listing pages | Free | $0 |
| **Squarespace Domains** | Registrar for domicircles.com (DNS is on Cloudflare) | — | ~$20/year renewal (first year was ~$10; check the renewal notice) |
| **GitHub** | Source code (`ellenwoconnor/domi`) | Free | $0 |
| **GeoNames** | US zip code reference data (`scripts/import-zips.mjs`) | Free, CC BY 4.0 | $0; credited on You (`app/you.tsx`) and in the privacy policy |
| **Google Fonts** | Fraunces and Figtree (bundled in the app; the website loads them from Google) | Free | $0 |

## IDs that are safe to expose

These are public identifiers. They ship inside the app or the website, or they're visible to anyone who looks. Fine in git, docs, and screenshots.

| What | Value | Where it's used |
| --- | --- | --- |
| Apple Team ID | `8XGZ3GZ28Q` | `web/src/index.js` (apple-app-site-association) |
| iOS bundle ID / Android package | `com.ellenwoconnor.domi` | `app.json`, `convex/lib/idTokens.ts` |
| App Store Connect app (Apple ID) | `6827833753` | `eas.json` (`submit.production.ios.ascAppId`) |
| EAS project ID | `143c2f13-0e37-45a7-8f0a-21432b734733` | `app.json` |
| Expo slug | `domi` | `app.json` |
| Google Cloud project number | `681321857586` | inside the client IDs |
| Google iOS OAuth client ID | `681321857586-ia8edhlh1fj49f84deap0ti7er8ad16j.apps.googleusercontent.com` | `.env.local`, `app.json` (URL scheme) |
| Google web OAuth client ID | `681321857586-j15evloc5hlnaqv81hs47n5nin2gn1k1.apps.googleusercontent.com` | `.env.local`, Convex env `AUTH_GOOGLE_ID` |
| Convex team / project | `ellen-o-connor` / `domi` | dashboard |
| Convex dev deployment | `sincere-corgi-37` → `https://sincere-corgi-37.convex.cloud` (HTTP actions: `.convex.site`) | `.env.local`, `web/wrangler.toml` |
| Convex prod deployment | `rugged-dragon-667` → `https://rugged-dragon-667.convex.cloud` (HTTP actions: `.convex.site`) | EAS env vars (environment `production`); `web/wrangler.toml` once the first circle moves to TestFlight |
| Cloudflare account ID | `b0f8e0d4a12ccb67e937209833ae618d` | wrangler (not secret, but no need to publish) |
| Cloudflare Worker | `domicircles` on `domicircles.com` | `web/wrangler.toml` |
| Domain | `domicircles.com` | app links, website, terms and privacy pages |
| Support email | `support@domicircles.com` (listed in the terms and privacy policy; set up forwarding with Cloudflare Email Routing, free) | — |
| App URL scheme | `domi://` | `app.json` |

## Secrets (never in git or app code)

Names and where each one lives; values stay in those places.

| Secret | Lives in | Notes |
| --- | --- | --- |
| `JWT_PRIVATE_KEY` | Convex env (per deployment) | Signs session tokens. Made by `npm run setup:auth`. (`JWKS` beside it is the public half.) |
| `AUTH_GOOGLE_SECRET` | Convex env (dev only) | Not used by the code (native sign-in only needs `AUTH_GOOGLE_ID`); safe to remove. Not set on prod. |
| `DEV_PASSWORD_AUTH` | Convex env, dev only | Not a secret, but **must never be `true` on prod**. |
| Apple distribution certificate, provisioning profiles | EAS (managed credentials) | `npx eas-cli credentials` to view. |
| APNs key (push) | EAS | Apple allows 2 per account; reuse it. |
| Sign in with Apple key (.p8) | Convex env, later | Needed to revoke Apple sign-in on account deletion (App Review). |
| Convex deploy key | Only if CI deploys | Not used yet. |
| Expo access token (`EXPO_TOKEN`) | Only if CI builds | Not used yet. |
| Cloudflare login / API token | Your Mac (`wrangler login`) | — |
| Accounts: Apple ID, Google, Convex, Expo, Cloudflare, Squarespace, GitHub | Your password manager | Turn on 2FA everywhere. |

## Free-tier limits that matter

| Vendor | Free tier | What happens past it | Next step up |
| --- | --- | --- | --- |
| Convex | 1M function calls/mo, 0.5 GB database, 1 GB database I/O/mo, 1 GB file storage, **1 GB file egress/mo**, 20 GB-hours action compute | **Hard caps: writes can start failing** | Starter: $0 base, pay as you go ($2.20/M calls, $0.132/GB file egress, $0.22/GB DB). Pro: $25/developer/mo with much bigger allowances |
| Expo EAS | 15 iOS + 15 Android builds/mo, low-priority queue (slow), 1,000 update users/mo | Builds stop until next month | Starter: $19/mo + usage, fast queue |
| Expo push | Free, 600 notifications/sec per project | — | — |
| Cloudflare Workers | 100,000 requests/day | Requests fail for the rest of the day | Paid: $5/mo, 10M requests |

## Watch: photo bandwidth

The cost most likely to grow is **Convex file egress** (people downloading photos). Every time the app shows a photo it downloads it, and the free tier is only 1 GB/month: about 5,000 views of a 200 KB photo. Built 2026-10-24:

1. Each photo is saved twice: a ~600 px thumbnail (~50 KB) for feeds and lists, and the full photo (~1,600 px, ~250 KB) only for item detail.
2. The app shows photos with `expo-image`, which caches them on disk, so each phone downloads each photo once.
3. The shared-listing web page and its link previews get the photo from Cloudflare's cache (`/p/<code>` on the Worker), not from Convex.
4. Uploads are capped (images only, 2 MB, 60 upload URLs per person per hour) and abandoned uploads are deleted daily.

With these, a user browsing ~30 new listings a day uses about 1–2 MB/day, roughly 40 MB/month.

## Cost projection

Rough estimates. Fixed costs: Apple $99/yr + domain ~$20/yr ≈ **$10/month**. Google Play adds $25 once if/when Android ships.

| Stage | Users (monthly active) | Convex | EAS | Cloudflare | Other | **Total / month** |
| --- | --- | --- | --- | --- | --- | --- |
| Now (building) | just you + test accounts | $0 | $0 | $0 | $10 | **~$10** |
| Launch: first circle | ~50–150 | $0–5 (switch to Starter so caps can't break the app) | $0 | $0 | $10 | **~$10–15** |
| Several circles | ~1,000 | ~$5–20 (function calls + photo egress, with thumbnails) | $0–19 (Starter if the free build queue is too slow) | $0 | $10 | **~$15–50** |
| Growing | ~10,000 | ~$25–75 (Pro + some usage) | $19 | $0–5 | $10 | **~$55–110** |

Assumptions: ~150 Convex function calls per active user per day (live queries re-run when data changes), photos compressed with thumbnails and cached, a handful of EAS builds per month, push volume far below Expo's limit. Without thumbnails and caching, photo egress at ~1,000 users could alone be $50–80/month.

**Against the $35/month goal:** comfortable through launch and the first few hundred users. The two things to do before launch are (1) move Convex to the pay-as-you-go Starter plan (no base fee) so a free-tier cap can't stop the app, and (2) build thumbnails and image caching in M3.

## Sources

- Convex plans: https://www.convex.dev/plans and limits: https://docs.convex.dev/production/state/limits
- Expo pricing: https://expo.dev/pricing and push FAQ: https://docs.expo.dev/push-notifications/faq/
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Squarespace .com price: https://domainoffer.net/tld/com/squarespace
