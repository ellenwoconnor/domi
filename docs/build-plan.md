# Build plan

Work one milestone at a time. Each ends with its "done when" checks passing.

Backend: Convex (switched from Supabase on 2026-10-16, before any backend code existed). Authorization lives in Convex functions, not row-level security; see "Access checks" in `CLAUDE.md`.

## Current sequencing (2026-10-21)

Backend first while the Apple Developer account is pending. The Convex backend for M1–M4 (schema, access checks, every state change, events, expiry cron, tests) is built ahead of the screens, on branch `backend-core`; see the updated `docs/spec.md`. A dev-only password sign-in (`DEV_PASSWORD_AUTH=true` on the dev deployment) stands in for Apple/Google so several test accounts can be used.

Still blocked on the Apple account: the EAS dev build and native Sign in with Apple (M1), Universal Links (M2), iOS push (M5), TestFlight (M6). Not blocked: wiring the app screens to the backend, Google sign-in, the Android path, the invite and share landing pages, terms and privacy policy.

The backend "done when" checks are proved by tests; the device checks in each milestone still apply once screens are wired.

## M0. Project setup
- Expo app (SDK 57, matching the App Store Expo Go) with TypeScript, Expo Router, TanStack Query (via `@convex-dev/react-query`). Convex project initialized with a dev deployment.
- `.env.example` with `CONVEX_DEPLOYMENT` and `EXPO_PUBLIC_CONVEX_URL`; `.env.local` gitignored (written by `npx convex dev`).
- `appConfig` table, idempotent `init` seed, and a `convex-test` suite.
- Done when: app runs on a phone via Expo Go or a dev build and reads a row from the Convex dev deployment.

## M1. Auth and profile (spike native sign-in first)
- **Spike first:** set up an EAS development build (needs the paid Apple Developer account; local iOS builds don't work on the dev Mac), then native Sign in with Apple and Google on a real device. Try Convex Auth; if native Apple/Google is awkward, fall back to Clerk + Convex. Decide before building profile screens. Session persists across restarts.
- Profile setup: display name, zip code, coarse location, terms acceptance. Account deletion. (Backend done: `profiles.ts`.)
- Zip change with `previewZipChange` query and `changeZip` mutation (can land in M4 once items and requests exist).
- `profiles` table with access checks and tests.
- Done when: sign in, kill the app, reopen still signed in; profile saved; deletion removes the user.

## M2. Circles and invite links (spike deep links early)
- `communities`, `memberships` with access checks and tests. Create a circle with name and emoji. (Backend done: `communities.ts`, `invites.ts`.)
- Invite link + `redeemInvite` mutation. Universal Links / App Links config.
- First-launch "enter invite code" fallback.
- Status 2026-10-21 (later): navigation is now Browse · Give · My stuff, with You opened from the My stuff avatar; circle page simplified (round-5 design).
- Status 2026-10-21: app screens built (You tab with circles, circle detail/create/edit, join with code, invite share sheet, `/c/` and `/i/` link routes), `web/` Worker built and tested. Remaining: DNS to Cloudflare, Worker deploy, rebuild with associated domains, device checks.
- Done when: on a real device, tapping a link (app installed) lands in the right circle, and entering the code works on a fresh install.

## M3. Post and browse
- `items`, `itemCommunities` with access checks and tests. Camera-first posting with on-device compression to Convex file storage.
- Feed per circle, item detail, keyword search (Convex search index). (Backend done: `items.ts`, `requests.ts`, `shares.ts`, `wishlist.ts`.)
- Done when: account A posts to two circles; account B in one of them sees it; account C in neither cannot.

## M4. Threads and messaging
- `conversations`, `messages`, `blocks`, `reports` with access checks and tests. Realtime delivery comes from Convex live queries. (Backend done: `conversations.ts`, `safety.ts`.)
- Owner view lists everyone who asked; recipient picker sets status to pending; Mark picked up sets gone.
- Done when: two devices chat in realtime; a third account cannot read the thread (test proves it); block stops new messages.

## M5. Events and push
- `events`, `pushTokens`. The mutations that change state write events per the table in `docs/spec.md`. (Events and `activity.ts` done; `sendPush` not yet.)
- Writing an event schedules a `sendPush` action (`ctx.scheduler.runAfter(0, ...)`). The in-app "what needs you" view is My stuff (built 2026-10-21, `mystuff.ts`), not an Activity feed.
- Ask push permission after the first meaningful action, not at launch.
- Done when: on physical devices, each transition sends the right push to the right person with role-specific copy, and My stuff shows the same thing.

## M6. Expiry, caps, and launch readiness
- Convex cron jobs (`convex/crons.ts`) for listing expiry and daily digest; open-request cap per user, per-circle mute. (Expiry, photo purge, cap and mute done; digest not yet.)
- Privacy policy, terms, store forms. TestFlight and Google Play closed test (12 testers, 14 days).
- Done when: the app passes an internal test with real users from the first circle.
