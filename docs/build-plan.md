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
- Status 2026-10-21: app screens built (You tab with circles, circle detail/create/edit, join with code, invite share sheet, `/c/` and `/i/` link routes), `web/` Worker built and tested.
- Status 2026-10-24: DNS is on Cloudflare and the Worker is live on domicircles.com (invite links work; see `docs/vendors.md`). Remaining: confirm on a device that links open the installed app, and the fresh-install code check.
- Done when: on a real device, tapping a link (app installed) lands in the right circle, and entering the code works on a fresh install.

## M3. Post and browse
- `items`, `itemCommunities` with access checks and tests. Camera-first posting with on-device compression to Convex file storage.
- Feed per circle, item detail, keyword search (Convex search index). (Backend done: `items.ts`, `requests.ts`, `shares.ts`, `wishlist.ts`.)
- Done when: account A posts to two circles; account B in one of them sees it; account C in neither cannot.
- Status 2026-10-24: screens built on branch `m3-post-browse` (Browse, item detail, camera-first Give, the placard for new/edit, circle picker, posted screen, owner view with Share outside Domi). Backend done-when check is a test; device QA in progress. Picking a recipient is M4.

## M4. Threads and messaging
- `conversations`, `messages`, `blocks`, `reports` with access checks and tests. Realtime delivery comes from Convex live queries. (Backend done: `conversations.ts`, `safety.ts`.)
- Owner view lists everyone who asked; recipient picker sets status to pending; Mark picked up sets gone.
- Done when: two devices chat in realtime; a third account cannot read the thread (test proves it); block stops new messages.
- Full requirements and decisions (2026-10-24): `docs/m4-requirements.md`. Closed chats stay readable; report and block screens are part of M4.

## M4b. Wishes on real data
- Replace the mock wishes (Browse › Wishes, Add wish, the Give strip, the fulfill flow) with `wishlist.ts`; add the wisher's offers screen. (Backend done.) Split from M4 on 2026-10-24. (Screens built 2026-10-24 on branch `m4b-wishes`; device check pending.)
- Done when: post, browse, offer, the wisher picks, chat, picked up → wish fulfilled, all on Convex; mock wish data deleted. Details: `docs/m4-requirements.md`, "M4b".

## M5. Events and push
- `events`, `pushTokens`. The mutations that change state write events per the table in `docs/spec.md`. (Events and `activity.ts` done.)
- Only events with an action push (9 types, plus a wish match); chat messages merge into one push. Circle activity pushes (welcome: 5 per circle joined; then back-off at 3/7/14/30 days without an open) replace the daily digest, which moved here from M6 on 2026-10-25.
- Ask permission right after the "How Domi works" cards (naming the circle), after joining a circle, and at high-intent moments; our own screen before the system dialog.
- Full requirements and decisions (2026-10-25): `docs/m5-requirements.md`.
- Status 2026-10-25: built on branch `m5-push` (backend with tests; permission screen, token registration, tap routing, You › Notifications). Still to do: Firebase/FCM credentials for Android, APNs key for iOS, a new dev build, and the device checks.
- Done when: on physical devices, each push type reaches the right person with role-specific copy and opens the right screen; merged chat pushes; circle activity pushes follow the welcome and back-off rules, never at night.

## M6. Expiry, caps, and launch readiness
- Convex cron jobs (`convex/crons.ts`) for listing expiry; open-request cap per user, per-circle mute. (Done. The digest became M5's circle activity pushes.)
- Terms of Service and Privacy Policy (done 2026-10-24): text in `web/src/legal.js`, served at domicircles.com/terms and /privacy, linked from sign-in, onboarding and You. `terms_version` is 2026-10-25. support@domicircles.com is set up.
- Rate limits, the circle cap and the terms re-acceptance screen (done 2026-10-27). App Review fixes (done 2026-11-02, `docs/app-review.md`).
- The rest of launch readiness is the launch plan below (replaces the 2026-10-27 M6 checklist).
- Done when: the app passes an internal test with real users from the first circle.

## Launch plan (2026-11-03)

**This is the one to-do list for launch.** Tick items here. It replaces the M6 checklist, the open "Cost controls" items and the "To do" list (2026-10-25), which are all folded in below.

**Rule for scope:** an item goes in a phase only if that phase's goal fails without it. Everything else lives in the [Domi backlog](https://claude.ai/artifact/GB4FgkQLYB6MC6aUHXGf77) (since 2026-11-10), each item with the trigger that pulls it into a phase.

**Target dates (set 2026-11-03):**

| Phase | Target | Gating item |
| --- | --- | --- |
| 1. Friends and family | **Mon Nov 9** | Beta App Review takes about a day: submit by Thu Nov 5 |
| 2. Buy Nothing beta | **Mon Nov 23** | Meta app setup and the Android build; start them first |
| 3. Public launch | **Mon Dec 7** (assumed same 2-week pace; tentative) | Play production access needs the closed test to run 14 days first, so start it by Mon Nov 16 |

### Phase 1: Friends and family (now, target Mon Nov 9)

**Goal:** a stable build with the MVP features, where joining is just: get a link → TestFlight → Domi.

#### 1a. Switch to an external TestFlight group with a public link
Internal testing makes each person accept two emails in order (App Store Connect, then TestFlight). An external group with a public link needs neither: tap link → install TestFlight → install Domi.
- [x] (Inferred from Beta App Review approval on 2026-11-10, which needs the review account.) Seed the App Review circle on prod and make the review account (steps in `docs/app-review.md`, "Before submitting" step 2).
- [x] App Store Connect: App Privacy answers, description, support URL (domicircles.com/support), privacy URL (`docs/app-review.md` steps 3 and 4).
- [x] (Approved 2026-11-10; group "dominos", public link https://testflight.apple.com/join/ZNuE3qN7.) Create the external group, turn on the public link, add the build, and submit for Beta App Review with the review notes (`docs/app-review.md` step 5). Usually takes about a day. Later builds of the same version often skip review.
- [x] Put the public link in `TESTFLIGHT_URL` in `web/wrangler.toml`, then `cd web && npx wrangler deploy`, so the "Get Domi" step on invite, listing and /beta pages works. Until then step 2 says "Ask <inviter> to send you the Domi test link." (Get it: App Store Connect › Domi › TestFlight › the external group › Public Link, after Beta App Review approves a build. Looks like `https://testflight.apple.com/join/…`.)
- [ ] Move current internal testers over: send them the public link. Keep the internal group for yourself, since internal builds skip review.

#### 1b. Production backend and website
Prod (`rugged-dragon-667`) exists and `wrangler.toml` already points at it (not committed yet).
- [ ] Check prod: full zip table loaded, `DEV_PASSWORD_AUTH` not set, report alerts sent and received (`web/README.md`).
- [x] (Done: both committed; the site is live with the TestFlight link.) Commit `web/wrangler.toml` and `convex/_generated`, then `cd web && npx wrangler deploy`.
- [x] (Done 2026-11-10, $40/month limit.) Move Convex to Starter (pay as you go, $0 base) **before** sending the public link. On the free plan, a hit cap breaks the app for everyone.
- [x] (Merged 2026-11-02, commit b3a4b26.) Merge branch `zip-limit-no-shows` (zip change limit, mark missed pickup) once tests pass, and ship it with `npm run update:production`.

#### 1c. Stability: one full run on real phones
Several milestones were built and tested in code, but their checks on a real device are still open.
- [ ] Write the test script: invite link → install → sign up → post → request → pick → chat → pickup → wish and fulfill → push.
- [ ] Run it on two iPhones using the TestFlight build on prod. It covers the open device checks: an invite link opens the installed app (M2), the code works on a fresh install (M2), chat and block (M4), wishes (M4b), every push type (M5), and the Circles tab.
- [ ] Fix anything that blocks the script. Write everything else down for phase 2.
  - 2026-11-08 run (fresh accounts, sections 0–2 of the checklist): fixes on branch `test-fixes`. Also added: editing a wish (server change: needs `npx convex deploy`), and adding a wish moved from the sheet to the listing editor. Sheets close on swipe down (the wish sheet couldn't be dismissed); delete account asks in a Domi sheet and no longer flashes the signup screen; invite and listing pages show a hint when the open-in-Domi button does nothing (app not installed). Ship: merge, `npm run update:production` (app) and `cd web && npx wrangler deploy` (website).

#### 1d. Easy onboarding
- [ ] **Open where the link pointed**: after signing up from an invite, open that circle instead of Browse. Small, JS only, and it's the moment new people notice most. (Status 2026-11-12: returning users who sign in from a link already land on the circle; new signups still go to the welcome cards, then Browse.)
- [x] Show the invite on the sign-in screen ("Ellen invited you to …") when a code is saved. Done 2026-11-08 (`src/features/auth/SignInInvite.tsx`), together with install match below and a visible code box at signup (live "You'll join …" check).
- [x] iPhone install match, moved up from phase 3 after the 2026-11-08 test run (new users lost the code between the web page and first open). Buttons on invite and listing pages send the code to `POST /m`; the Worker keeps it an hour under a salted IP hash in KV (`web/src/match.js`); the sign-in screen asks `GET /m` and shows "Ellen invited you to … Is that you?". Privacy Policy updated. Doesn't match when Safari uses iCloud Private Relay or the phone changes networks; the code box covers those.
- [x] (Done: `MATCHES` namespace in `wrangler.toml`, commit 25ebd6d.) Set up install match on Cloudflare: `cd web && npx wrangler kv namespace create MATCHES`, paste the id into the commented `[[kv_namespaces]]` block in `wrangler.toml` and uncomment it, `npx wrangler secret put MATCH_SALT` (any long random string), then `npx wrangler deploy`. Until then `/m` does nothing and people type the code.

#### 1e. Finalize brand details
Settle what testers see first: the app icon, the TestFlight description, the website and the invite pages. Open questions come from "Domi Circles — Brand Strategy (Draft)" in Drive.
- [ ] Decide the launch audience and lead message. Recommendation: the East Bay parent first (not students), gifting first. That matches what's built, since everything on Domi is free for now. (Still open in the brand strategy doc.)
- [x] (Done: "Good things find a new home nearby." on the home page and the welcome screen. Check the TestFlight description uses it too.) Pick the tagline ("Pass it on, close to home." / "Good things stay in the neighborhood." / "Give it a new home nearby.") and use it on the home page, the TestFlight and App Store description, and invite pages.
- [x] (Replaced: the headline is now "Good things find a new home nearby.") Replace or keep the home page headline "Outgrown, not outrun." (`web/src/home.js`). It reads as confusing.
- [x] (Leaning poppy icon, 2026-11-07, in the build approved 2026-11-10.) Lock the logo and app icon for the TestFlight build (icon changes need a new build). A designer's pass on the logo can come later.

#### 1f. Feedback for this phase
- **Decision:** don't build anything. Use TestFlight's built-in feedback (screenshot, then Share Beta Feedback) plus a group text. Tell testers how in the invite message.

**Not in phase 1:** renaming karma (karma isn't in the MVP), instrumentation, the in-app feedback button, Facebook login, Android, location picker, QR invites.

---

### Phase 2: Beta with Buy Nothing superusers (target Mon Nov 23)

**Goal:** learn whether strangers who already give things away keep using Domi, and why. That needs numbers (instrumentation) and their words (feedback).

#### 2a. Instrumentation
- [ ] **First, write down 5–8 questions**, for example: share of invitees who finish signup; first post within 7 days; requests per listing; time to first request; share of listings picked up; weekly return; who invites whom.
- [ ] **Decision to make (recommendation):** answer most of these from data Convex already has (the `events` table, items, requests, memberships) with one `analytics` query you run with `npx convex run`. No new vendor. Add PostHog (free tier, Expo SDK) only for what Convex can't see: screen views and where people drop off in onboarding. Adding a vendor needs your OK, and the privacy policy and App Privacy answers would need updating.

#### 2b. Feedback mechanisms
- [ ] "Send feedback" item in You: a text box that saves to Convex and emails you, reusing the report-alert path (`convex/moderation.ts` → Worker email). Include app version and user ID automatically.
- [ ] Run the support agent in shadow mode on support@domicircles.com: it drafts, you send. Track accept rate (`support-agent/README.md`).
- [ ] A short check-in with each superuser after 2 weeks (a call or 3 questions). Keep this manual.

#### 2c. Fixes needed before strangers join
Superusers will post share links in Buy Nothing groups, so links will reach people outside any circle.
- [ ] Leave out `approxLat`/`approxLng` (`convex/lib/cards.ts`) for people who reached the listing only through a share link.
- [ ] "Stop sharing" on the owner's listing, calling the existing `shares.revoke`.
- [x] (Done 2026-11-09, commit d8e0b06.) Mark requests that came in through a link ("via your link") so owners can favor neighbors.

#### 2d. Sign in with Facebook
Buy Nothing superusers mostly live on Facebook, so this cuts signup friction for them. It's a new dependency and native code, so it needs a new build and the Meta setup takes a while: start it early in phase 2.
- [ ] Meta developer app for Domi (app ID and client token; both are public IDs). Add the bundle ID `com.ellenwoconnor.domi`.
- [ ] Add `react-native-fbsdk-next` (native, so a new `build:dev:ios` and prod build). Approved here as an exception to "ask before adding a dependency".
- [ ] Use Facebook **Limited Login** on iOS. It returns an OpenID ID token, so it fits the existing `signIn(provider, { idToken })` path: add a `facebook` case to `convex/lib/idTokens.ts` that checks the token against Facebook's published keys, with tests. Confirm the current Limited Login details in Meta's docs first.
- [ ] Ask only for the basic profile (name). Don't request friends, email or any permission that needs Meta App Review.
- [ ] Account linking: decide what happens when someone who signed up with Google or Apple later taps Facebook. Recommendation: no automatic merging by email; it's a new account unless they're signed in.
- [ ] Meta requires a data deletion URL or instructions: point it at the in-app delete account steps on domicircles.com/support.
- [ ] Update the Privacy Policy (Facebook as a sign-in provider), bump `terms_version` only if the Terms change, and update the App Privacy answers in App Store Connect.
- [ ] Add a "Continue with Facebook" button to sign-in, under Apple and Google. Sign in with Apple stays, which Apple requires when other social logins are offered.
- [ ] Add Meta to `docs/vendors.md`.

#### 2e. Android (Google Play closed test)
Many Buy Nothing members use Android, and Google requires a closed test (currently 12 testers opted in for 14 days on new personal accounts; confirm in Play Console) before the app can go to production. So the closed test also unlocks the Play launch in phase 3. Nothing is set up yet beyond the package name `com.ellenwoconnor.domi` and icons in `app.json`.
- [ ] Google Play Console account ($25 one-time) and the Domi app record.
- [ ] Android scripts in `package.json`: `build:dev:android`, `build:prod:android`, `submit:android`, and `--platform all` (or an Android twin) for `update:production`.
- [ ] Push: Firebase project and FCM credentials uploaded to EAS (`google-services.json` in `app.json`), carried over from M5.
- [ ] Google sign-in: an Android OAuth client in Google Cloud with the signing certificate's SHA-1 (EAS credentials show it).
- [ ] App Links: put the signing certificate's SHA-256 in `ANDROID_SHA256` in `web/wrangler.toml` and deploy, so invite links open the app.
- [ ] Sign in with Facebook on Android: add the key hash to the Meta app (2d).
- [ ] Play Console forms: Data safety, content rating (match the 18+ Terms), target audience, US only, privacy URL.
- [ ] Closed test track with an opt-in link; make the "Get Domi" button send Android phones there.
- [ ] Run the phase 1 test script on an Android phone.

#### 2f. Growth features the superusers will use
- [ ] Invite QR code (plan in `docs/build-plan.md`, "To do"). Superusers invite in person, and it ships without a new build. Needs a small QR library: ask first.
- [ ] End the create-circle flow on an "Invite your first members" step (share, copy link, QR).

#### 2g. Neighbor card and thank-you tokens
Strangers arrive in phase 2, and the giver picks who gets each item, so "who is this person?" needs an answer. The thank-you token is the handoff celebration from the Buy Nothing research (2026-11-03): the most-loved part of Buy Nothing was gratitude. Scope change: the spec lists "karma/points" as out of scope. Tokens are thanks you can't lose, not a score, so they're allowed; update `docs/spec.md` (scope line and decision log) when this is built.
- [x] (Poppy, the "domi flower", 2026-11-07.) **Pick the token** with a quick mock at real size: poppy (bouquet that fills in), cookie (with ripples on the profile) or marble jar. Working name below: "poppies".
- [ ] **Send a poppy** after a handoff, in both directions ("Maya sent you a poppy for the crib"), from the picked-up screen and the chat. One per person per handoff. Writes an event and pushes per the events rules. (Status 2026-11-12: recipient → giver is built, `thanks.send`; giver → recipient is still to do.)
- [ ] **Handoff moment**: the short "The crib is home." screen for both people when an item is marked picked up, leading into Send a poppy. Decide whether the recipient confirms with a "Home!" tap.
- [ ] **Neighbor card**: tap a name to open it. Shows name and initial avatar (no photo uploads), the circles you share ("You're both in Rose St Parents"), member since, and their poppies as the filled-in display, never a number to rank by. No pickup history, nothing that hints at where they live.
- [ ] Only people who share a circle with them can open it, plus the owner of a listing they requested through a share link. Access checks and allowed/denied tests in `convex/`.
- [ ] Open it from: the owner's list of people who asked (most important), the chat header, item detail, and Browse cards once cards show the giver.
- [ ] Nothing negative ever shows: missed pickups stay private (`convex/lib/noShows.ts`).

**Not in phase 2:** location picker (in one or two zips the zip center is close enough), referral links.

---

### Phase 3: Public launch (App Store and Google Play, tentative Mon Dec 7)

**Goal:** strangers at any volume can't run up a bill or break the app.

#### 3a. Cost and abuse limits
- [x] Rate limits on posting, wishes, chat and code redemption; cap of 10 circles per person (done 2026-10-27).
- [x] Photo thumbnails, disk caching, upload limits, daily cleanup of unused uploads (done 2026-10-24).
- [ ] Cloudflare rate-limiting rule on `/c/*` and `/i/*`, plus short caching of the "link not working" pages (Cloudflare dashboard, free plan).
- [x] (Done 2026-11-10: Starter with a $40/month limit.) Convex spending alert or cap in billing. Check the usage page weekly for the first month.
- [ ] Habit: ship JS-only changes with `update:production`, not a new build (15 free iOS builds a month).

#### 3b. App Store and Google Play submission
- [ ] Age rating questionnaire, with the override set to 18+. Availability: United States (`docs/app-review.md` step 3).
- [ ] Screenshots, App Store description, keywords.
- [ ] Revoke the Apple sign-in token on account deletion (needs the Sign in with Apple key in Convex env).
- [ ] Website: App Store and Google Play badges and Apple's Smart App Banner, replacing the TestFlight and closed-test steps.
- [ ] Google Play: apply for production access once the closed test has run its 14 days, then release.
- [x] iPhone install match: done early, in phase 1d.

---

### Later (decided: not before launch)

Moved to the [Domi backlog](https://claude.ai/artifact/GB4FgkQLYB6MC6aUHXGf77) on 2026-11-10.

### Launch work already done
Circles tab (2026-10-25). Terms re-acceptance screen. Content filter, report emails, iPhone only (App Review fixes). Single-use share links. `ITSAppUsesNonExemptEncryption` set. Prod Convex deployment and App Store Connect app record exist.

## Cost controls (noted 2026-10-24)

History. Open items here are tracked in the launch plan (phase 1b and 3a).

From a cost review of the code against `docs/vendors.md`. Today every vendor stops at a hard free-tier cap; once Convex moves to pay-as-you-go Starter, abuse or waste becomes a bill instead of an outage. So the "before launch" items land before that switch. Rate limits use `convex/lib/rateLimit.ts` (a fixed window per user and action).

Before launch (photo bandwidth, the biggest cost). Done 2026-10-24; thumbnails are 600 px so two-column tiles stay sharp on 3x screens:
- [x] Thumbnails: save a ~400 px (~40 KB) copy at upload for feeds and cards; keep the 1,600 px photo for item detail only. Today `browse` and `search` return the full photo for every card.
- [x] Disk-cached images: replace React Native `Image` in `PhotoTile` and the other photo screens with `expo-image` (native code, so a new dev build).
- [x] Shared-listing page: serve the `/i/` photo and link-preview image through the Worker with Cloudflare caching (or point them at the thumbnail), so web visits and iMessage/Slack/WhatsApp previews don't each pull the full photo from Convex.

Before launch (uploads). Done 2026-10-24, with a small built-in limiter (`convex/lib/rateLimit.ts`) rather than the rate-limiter component; the remaining limits below can use it too:
- [x] In `checkPhotos`, reject files over ~1 MB or not an image (the `_storage` system record has `size` and `contentType`).
- [x] Daily cron: delete stored files older than a day that no item uses (uploads abandoned mid-post are never cleaned up today).
- [x] Rate-limit `items.generateUploadUrl` (60/hour: each photo is two uploads).

Rate limits (with the above, or by M6):
- [x] `items.create` and `items.repost`: ~20/day. (M6, with offers; wishes have their own 20/day.)
- [x] `conversations.send`: ~30/minute (spam, and each message will send a push).
- [x] `invites.redeem` (and share-code redemption): ~10/hour.
- [x] Cap circles per user (~10). `browse` reads rows per circle, so this bounds the feed's cost too.
- [ ] Website: one Cloudflare rate-limiting rule (free plan) on `/c/*` and `/i/*`, and short Cloudflare caching of the "link not working" pages, so scraping can't run up Convex calls or use up the Worker's 100k requests/day.

Account settings (at the prod deployment, M6):
- [x] Move Convex to Starter and set a spending alert or cap in billing (done 2026-11-10, $40/month).
- [ ] Confirm `DEV_PASSWORD_AUTH` is not set on prod.
- [ ] Habit: ship JS-only changes with `npm run update:preview` rather than a build (15 free iOS builds/month).

When building push (M5):
- [x] Send to Expo in batches (up to 100 messages per request), not one call per event.

As usage grows (not urgent; now tracked in the backlog, #5):
- [ ] `browse` is a live query that re-runs for every viewer whenever any listing in their circles changes, reading up to `limit × 2` rows per circle. Move to a paginated feed if function calls or database bandwidth climb.

Already fine: search is debounced, open requests are capped at 5, `browse` returns at most 100, and all text fields have length limits.

## Possible follow-ups: invites and installs (noted 2026-10-24)

History. Open ideas from this list now live in the [Domi backlog](https://claude.ai/artifact/GB4FgkQLYB6MC6aUHXGf77).

Not scheduled; the ones that are scheduled now appear in the launch plan. Ideas from reviewing the invite flow end to end; pick up when they become useful or possible. Already done: returning users who sign in from a link get their saved codes redeemed (`profiles.redeemSavedCodes`), and the invite and listing pages say what Domi is.

Small, possible any time:
- Land where the link pointed: after signup or sign-in from an invite, open that circle (or the shared listing) instead of Browse.
- Paste button on the invite code fields (onboarding and Join a circle), accepting a pasted full link as well as a bare code.
- Show the invite on the sign-in screen ("Ellen invited you to Rockridge Baby Swap") when a code is saved, so the reason for signing up stays visible.
- Name the circle in onboarding copy, and show "Add another code" instead of "Have an invite code?" when a code is already saved.
- End the create-circle flow on an "Invite your first members" step (share, copy link, QR).
- "Share outside Domi" button on the owner's listing view (backend `shares.getOrCreate` and the `/i/` page are built; no screen calls them yet).
- Keep shared listings findable: a "Sent to you" section in My stuff for items reached through a share link.

Once TestFlight / Play testing exists:
- "Get Domi" button on the invite and listing pages: TestFlight public link on iPhone, Play closed-test opt-in on Android (later the store links). One link that sends each device to the right store.
- Android: put the invite code in the Play Store link's `referrer` and read it on first launch, so the code applies without typing.

Before testing widens beyond hand-added testers (M6):
- iPhone install match: the Worker records the invite code with a hashed IP for about an hour; on first launch the app asks "Ellen invited you to … Is that you?" and one tap applies the code. The code box stays as the fallback.

At App Store launch:
- Official store badges on the web pages, and Apple's Smart App Banner tag.

After the first circle is working (growth):
- "Invite neighbors to Domi" referral link (`/r/<code>`) for zip circles, which can't have circle invites; records who brought whom.
- Credit sharers: record who shared on profiles that came from a share link, and tell them ("3 people joined Domi from your high chair link").
- Show rough area and distance: neighborhood on the listing page, "12 mi from you" on listings, distance next to each requester.
- Direct invites to people you already share a circle with ("Invite from your circles"), with Join / Not now in My stuff.
- Product decisions to make: what people from nearby zips can see beyond one shared listing; whether to show item photos on invite pages; how to handle far-away requesters.
