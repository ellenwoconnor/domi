# Domi

An iPhone (and later Android) app for giving things away for free to people in your **circles**: your zip code, or invite-only groups like a baby-shower circle. A rebuild of the earlier Corcles web app, aiming for one thriving invite-driven circle at launch, running for about $35/month.

- Product, data model and access rules: [`docs/spec.md`](docs/spec.md)
- Milestones, status and the to-do lists: [`docs/build-plan.md`](docs/build-plan.md)
- Vendors, public IDs, secrets and costs: [`docs/vendors.md`](docs/vendors.md)
- Stack, repo layout, conventions and every command: [`CLAUDE.md`](CLAUDE.md)

## Stack in one paragraph

Expo SDK 57 (React Native, TypeScript, Expo Router) talking directly to **Convex** (database, functions, live queries, file storage, crons, Convex Auth with native Apple and Google sign-in). Builds, over-the-air updates and push go through **EAS**. The website on domicircles.com is a **Cloudflare Worker** in [`web/`](web/README.md) that serves app-link files and the pages behind invite (`/c/<code>`) and shared-listing (`/i/<code>`) links. There's no other server.

## Status (2026-10-24)

Built on Convex: sign-in and profile, circles and invite links, posting and browsing, requests, picking a recipient and pickup chat, report and block, wishes and offers, My stuff, listing expiry, and the cost controls (photo thumbnails, image caching, upload limits). Push notifications (M5) are built and waiting on device checks. Still to come: launch readiness (M6). Several milestones still need their on-device checks. See `docs/build-plan.md` for detail.

## Getting started

Needs Node 20+, a Convex account, an Expo account, and the Domi **development build** installed on your iPhone. The app no longer runs in Expo Go, because native sign-in needs native code. Since the dev Mac can't build iOS locally, builds run on Expo's servers:

```sh
npm install
npm run dev:backend      # terminal 1: Convex dev deployment. First run logs in, creates the project,
                         # writes .env.local and seeds data. Leave it running; it redeploys on save.
npm run setup:auth       # once per Convex deployment: session signing keys
npm run build:dev:ios    # only when the dev build is missing or native code changed (new native library, app.json plugins)
npm start                # terminal 2: open the Domi dev build on your phone and connect
```

Copy `.env.example` to `.env.local` for the Google client IDs. For several test accounts without Apple/Google, turn on the dev-only password sign-in, on the **dev** deployment only:

```sh
npx convex env set DEV_PASSWORD_AUTH true   # plus EXPO_PUBLIC_DEV_PASSWORD_AUTH=true in .env.local
```

## Everyday commands

```sh
npm test                 # backend tests (convex-test)
npm run typecheck        # app + convex
npm run test:web         # website Worker tests
npx convex dashboard     # data browser and logs
```

## Testing on other phones

- `npm run build:preview:ios` makes the shareable test app for registered iPhones. Register a new phone first with `npx eas-cli@latest device:create`.
- `npm run update:preview` sends JS/TS-only changes to installed preview builds. Anything native (a new native library, `app.json` plugins or permissions) needs a new build instead.

## Website

```sh
cd web && npx wrangler deploy
```

See [`web/README.md`](web/README.md) for routes and one-time setup.
