# M5 requirements: events and push

Agreed 2026-10-25. Sources: `docs/build-plan.md` (M5, and the digest from M6), `docs/spec.md` ("Item state machine and events"), cost controls ("Send to Expo in batches").

## Where we start

Every state change already writes its `events` row (`convex/lib/events.ts`, 16 types). `pushTokens`, `activity.registerPushToken`, per-circle mute (`communities.setMuted`) and `expo-notifications` (installed, in `app.json`) exist. Nothing sends a push and no screen asks for permission.

## Principles

- **Push only when there's something to do.** A push must name an action the person can or should take. Everything else stays in My stuff.
- **Mute is for circle-wide pushes only.** One-to-one coordination (requests, picks, chats) always comes through.
- **Push copy comes from `events`.** Every push, including circle activity, is an `events` row first (CLAUDE.md rule).
- **Push notifications, not SMS.** No phone numbers, no SMS vendor.

## Done when

1. On physical devices, each push type below reaches the right person with role-specific copy, and tapping it opens the right screen.
2. Several chat messages in a row arrive as one push; no push while that chat is open.
3. A new member gets circle activity pushes as described (welcome, then back-off), never at night, never more than one a day.
4. Typecheck and tests pass; tests cover who gets what, merging, mute, the welcome count, back-off, and quiet hours.

## R1. Which events push

| Event type | Who | Push copy (from the event) | Tap opens |
| --- | --- | --- | --- |
| `request_created` | owner | "Maya requested your crib" | the listing |
| `recipient_withdrew` | owner | "Maya can't take the crib anymore" | the listing |
| `item_expired` | owner | "Your crib listing expired. Repost?" | the listing |
| `picked` | recipient | "The crib is yours! Message Ellen to plan pickup." | the chat |
| `unpicked` | former recipient | "Ellen un-picked you for the crib" | the listing |
| `new_message` | other participant | the message text (merged, R2) | the chat |
| `wish_offer` | wisher | "Sam offered a stroller for your wish" | the wish |
| `offer_picked` | offerer | "Maya chose your stroller! Message Maya…" | the chat |
| `offer_unpicked` | offerer | "Maya can't take the stroller anymore" | the listing |
| `wish_match` (new) | wisher | "Ellen posted a stroller. You wished for one." | the listing |
| `circle_activity` (new) | members | R3 | Browse (Offers or Wishes) |

Recorded but not pushed (no action): `pending_elsewhere`, `picked_up`, `picked_up_elsewhere`, `item_removed`, `request_expired`, `wish_closed`, `joined_via_invite`.

`unpicked` and `offer_unpicked` push because a pickup may already be arranged ("don't drive over").

## R2. Chat messages are merged

- The first message pushes right away. Messages from the same person in the same chat within 2 minutes of the last push fold into one push sent when the 2 minutes are up.
- At send time the push counts that person's unread messages since the last push: one → the message text; several → "3 new messages: <latest text>". None unread (they already read it) → no push.
- The app shows no banner for a chat that's open on screen.

## R3. Circle activity pushes (replaces the daily digest)

"Activity" = a new public listing or a new wish posted by someone else in one of your circles, still available/open, that you haven't seen (posted after you last opened the app), not from someone you blocked, not one you already requested. Muted circles don't count.

**Phase 1, welcome (per circle).** Each circle you join gives you 5 welcome pushes. The first new activity in a circle starts a 3-hour window; everything posted in the window goes into one push when it closes. Counted per push, not per item.

**Phase 2, back-off.** For circles whose 5 are used up: if you haven't opened the app, push about new activity no earlier than 3, 7, 14 and 30 days after your last open, then stop. Opening the app resets to the 3-day step (it doesn't restart the welcome).

**Always:** no push if nothing's new; never between 9pm and 8am local time (waits until 8am); at most one circle activity push per local day across all circles.

**Copy:** title is the circle ("🍼 Rockridge Baby Swap"); body names one thing: "Ellen posted a Bugaboo stroller", plus "+ 2 more" when there's more. Wishes only: "Maya is looking for a high chair. Have one?"

**Wish match.** A new listing whose title matches an open wish of yours in a shared circle pushes right away (`wish_match`), outside the welcome count and the daily cap. Matching is simple word matching on titles and is meant to be tuned.

## R4. Asking for permission

Two steps: our own screen first; only "Turn on notifications" shows the system dialog (which iOS shows only once).

1. **After signup:** right after the "How Domi works" cards, naming the zip circle (or the circle they were invited to): "Rockridge Baby Swap is just getting started. Get a heads-up when neighbors post something or someone wants your stuff." [Turn on notifications] [Not now]
2. **After joining or creating a circle later**, naming that circle, as a sheet.
3. **At high-intent moments** for people who said "Not now": after requesting an item, after posting, after making a wish.
4. **You › Notifications row**: on/off; when the system dialog was denied, "Notifications are off" with a link to Settings.

Limits: at most one ask a week, stop after 3 "Not now"s (the You row stays), never in the middle of a task. Same flow on Android 13+.

## R5. Tokens, time zone, opens, taps

- After permission, the app registers its Expo push token with the phone's time zone (`Intl` IANA name plus UTC offset). No setting, no question.
- Sign out removes this device's token first.
- The app records `lastOpenedAt` when it comes to the foreground (at most every 5 minutes); it drives "seen" and back-off.
- Each push sent is logged on its event (`pushedAt`); a tap records `openedAt`, so we can see open rates per type.
- Expo errors `DeviceNotRegistered` (on send or in receipts) delete that token.

## R6. Sending

- Writing an event that pushes sets its `pushDueAt` and makes sure one `push.flush` is scheduled for then. `flush` claims due events in a mutation (so two runs can't send the same push), sends to Expo in batches of up to 100, then checks receipts 15 minutes later.
- `EXPO_ACCESS_TOKEN` is used if set (Convex env), not required.
- A cron every 30 minutes processes circle activity that's due.

## Setup outside the code

- Android: Firebase project, `google-services.json` in the app (`android.googleServicesFile`), FCM V1 service account key uploaded to EAS (`eas credentials`).
- iOS: APNs key, created by EAS when the Apple Developer account is active.
- New dev build after the native config changes.

## Not in M5

App icon badge counts. Email fallback for people without push (separate decision; needs a vendor).
