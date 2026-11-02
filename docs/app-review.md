# App Review checklist

From the App Store policy audit of 2026-11-02. The code side is done (branch `app-review-fixes`); the rest is set up by hand in App Store Connect and Cloudflare.

## Done in code

- **Objectionable-content filter** (Guideline 1.2): `convex/lib/blockedWords.ts`, applied by `cleanText` to everything people post (listings, wishes, request notes, chat, names, circles). Report reasons are exempt. Narrow on purpose; add words there.
- **Report alerts**: every report emails you with what was reported and three commands to act on it (`convex/moderation.ts`: `removeContent`, `suspendAuthor`, `dismiss`). Sent by the website Worker (`web/src/alerts.js`) through Cloudflare Email Routing. Setup: `web/README.md`, "Report alerts setup".
- **iPhone only**: `supportsTablet: false` in `app.json` (no iPad screenshots or iPad review). Native change, so it ships with the next production build.
- **Privacy Policy**: says providers must protect data at least as well as the policy (5.1.1(i)). Deploy the Worker to publish it.

## Before submitting

1. Report alerts set up and tested on prod (`web/README.md`).
2. Seed the review circle on prod:
   - Make a Google account for review, e.g. domi.appreview@gmail.com. Add a recovery phone and sign in once on your phone so Google is less likely to block a new device.
   - From your own account: start a circle "App Review" 📦, post three listings with photos, and post one wish.
   - Sign the review account in on a second phone and join with the circle's invite code. From it: request one of your listings (then pick it from your account, so a chat is open), post a wish, and from your account offer something for it (so there's an offer to choose).
3. App Store Connect → App Information:
   - **Age rating**: answer the questionnaire honestly (user-generated content, messaging), then set the **override to 18+** to match the Terms. This also covers the Utah and Louisiana age laws without the Declared Age Range API.
   - **Availability**: United States only.
   - **Privacy Policy URL**: https://domicircles.com/privacy. **Support URL**: https://domicircles.com/support.
4. App Privacy (all "linked to the user", none "used for tracking", purpose "App Functionality"):
   - Contact info: Name (display name). Email address only if you keep the one from Apple or Google sign-in.
   - Location: Coarse location (zip and rounded lat/lng).
   - User content: Photos, Other user content (listings, wishes, notes), Other (messages: tick "Emails or text messages").
   - Identifiers: User ID; Device ID (push token).
5. Review notes (paste, filling in the blanks):

```
Domi is for giving things away free within small groups ("circles").
Each person is placed in a circle for their zip code, plus any invite-only
circles they join.

Demo account (Sign in with Google): ____________ / ____________
It is already in a circle called "App Review" with listings, a wish, an
open pickup chat, and an offer waiting on its wish.

To try it with your own Apple ID instead: Sign in with Apple, enter any US
zip code, tap "Have an invite code?" and enter ____-____ to join the
"App Review" circle.

Try: Browse > tap a listing > Request. My stuff > Getting > open the chat.
Browse > Wishes > your wish > choose the offer. Give > post a listing.

Safety: every listing, wish, message and person can be reported (… menu)
and blocked. Posts are screened for objectionable language. Reports email
the developer, who reviews them within 24 hours. Account deletion: You >
Delete account.
```

## Later (not needed to pass review)

- Revoke the Apple sign-in token on account deletion (Apple's account-deletion guidance; rarely checked). Needs the Sign in with Apple key in Convex env (`docs/vendors.md`).
