# Build plan

Work one milestone at a time. Each ends with its "done when" checks passing.

Backend: Convex (switched from Supabase on 2026-10-16, before any backend code existed). Authorization lives in Convex functions, not row-level security; see "Access checks" in `CLAUDE.md`.

## M0. Project setup
- Expo app (SDK 57, matching the App Store Expo Go) with TypeScript, Expo Router, TanStack Query (via `@convex-dev/react-query`). Convex project initialized with a dev deployment.
- `.env.example` with `CONVEX_DEPLOYMENT` and `EXPO_PUBLIC_CONVEX_URL`; `.env.local` gitignored (written by `npx convex dev`).
- `appConfig` table, idempotent `init` seed, and a `convex-test` suite.
- Done when: app runs on a phone via Expo Go or a dev build and reads a row from the Convex dev deployment.

## M1. Auth and profile (spike native sign-in first)
- **Spike first:** set up an EAS development build (needs the paid Apple Developer account; local iOS builds don't work on the dev Mac), then native Sign in with Apple and Google on a real device. Try Convex Auth; if native Apple/Google is awkward, fall back to Clerk + Convex. Decide before building profile screens. Session persists across restarts.
- Profile setup: display name, zip code, coarse location, terms acceptance. Account deletion.
- Zip change with `previewZipChange` query and `changeZip` mutation (can land in M4 once items and requests exist).
- `profiles` table with access checks and tests.
- Done when: sign in, kill the app, reopen still signed in; profile saved; deletion removes the user.

## M2. Circles and invite links (spike deep links early)
- `communities`, `memberships` with access checks and tests. Create a circle with name and emoji.
- Invite link + `redeemInvite` mutation. Universal Links / App Links config.
- First-launch "enter invite code" fallback.
- Done when: on a real device, tapping a link (app installed) lands in the right circle, and entering the code works on a fresh install.

## M3. Post and browse
- `items`, `itemCommunities` with access checks and tests. Camera-first posting with on-device compression to Convex file storage.
- Feed per circle, item detail, keyword search (Convex search index).
- Done when: account A posts to two circles; account B in one of them sees it; account C in neither cannot.

## M4. Threads and messaging
- `conversations`, `messages`, `blocks`, `reports` with access checks and tests. Realtime delivery comes from Convex live queries.
- Owner view lists everyone who asked; recipient picker sets status to pending; Mark picked up sets gone.
- Done when: two devices chat in realtime; a third account cannot read the thread (test proves it); block stops new messages.

## M5. Events, push, and Activity
- `events`, `pushTokens`. The mutations that change state write events per the table in `docs/spec.md`.
- Writing an event schedules a `sendPush` action (`ctx.scheduler.runAfter(0, ...)`). Activity tab reads events.
- Ask push permission after the first meaningful action, not at launch.
- Done when: on physical devices, each transition sends the right push to the right person with role-specific copy, and the Activity tab matches.

## M6. Expiry, caps, and launch readiness
- Convex cron jobs (`convex/crons.ts`) for listing expiry and daily digest; open-request cap per user, per-circle mute.
- Privacy policy, terms, store forms. TestFlight and Google Play closed test (12 testers, 14 days).
- Done when: the app passes an internal test with real users from the first circle.
