# Domi MVP spec

Source of truth: the "spec.md" Google Doc (2026-10-16), translated to Convex and updated with the decisions of 2026-10-21 (see Decisions log). Names below are Convex tables (camelCase).

## The core loop

A member posts an item to one or more circles. Neighbors request it with one tap, optionally adding a short note. The owner picks a recipient from everyone who requested. Domi opens a private thread between them for arranging pickup. The owner marks it picked up once the item is gone.

Wishes run the other way: a member posts a wish, neighbors offer items for it, the wisher picks the offer that works best, and Domi opens a thread for pickup.

## In scope

| Area | MVP |
| --- | --- |
| Accounts | Sign up with Apple or Google. Accept the terms of service. Provide display name, zip code, and optional coarse location (zip centroid if skipped). Placed in the default circle for the zip, plus any custom circles from invite links. In-app account deletion. |
| Circles | Create a custom circle with a name, an emoji, and an optional description. Any member can invite by sharing their own link. The creator is the circle's owner (admin): can remove members and delete the circle. Members can leave a custom circle. No invites into zip circles. |
| Listings | Camera-first posting: title, optional description, one to three photos. Post to several circles. Edit or remove. See requests with notes, pick a recipient, un-pick, mark picked up. Repost an expired listing. |
| Share outside Domi | The owner can send a single-use link for a listing to one person (e.g. a friend, or someone answering a wish on Buy Nothing). The link opens a read-only page; one person can request the listing through it, even if they share no circle with the owner. The listing stays posted to its circles and the owner picks the recipient as usual. |
| Browse | Items and wishes in all my circles or one circle. Item detail. Keyword search. |
| Wishes | Post a wish to circles I'm in, and edit it while it's open. Neighbors offer items for it (private listings). Offers accumulate; the wisher picks one. |
| Request | Request an item with an optional note (up to 140 characters). Requests are allowed while an item is pending: they wait in line and the app shows the item is pending. |
| Messaging | A thread opens when a recipient is picked; either side can message. |
| Profile | View and edit profile, including zip, with a confirmation that lists what will be cancelled in the old zip circle. |
| Lifecycle | Available → Pending → Gone, or Expired after 30 days, or Removed. |
| Notifications | Push, fed by `events`, only when there's something to do. In the app, the My stuff tab shows what needs you (see "My stuff"). At most one circle activity push per day. |
| Growth | Invite links that land people in the right circle, with a web landing page for people without the app. Listing share links (above). |
| Thanks | From pickup time on, the person who got the item can send the giver one domi flower (a thank-you poppy), with an optional note. Private to the two of them; never counted. See "Domi flower". |
| Safety | Report and block. Block hides each person's items, wishes and messages from the other. Manual review in the Convex dashboard. Cap of 5 open requests per user. `bannedAt` on profiles to suspend. |

## Out of scope for MVP

Paid listings, bidding, price cuts, payments, escrow, karma/points, calendar scheduling UI, private wishes, profile photo upload (field exists, unused), phone OTP, email or Facebook login (a dev-only password sign-in exists for testing and must never be enabled in production), AI features, migrating data or users from Corcles.

## Navigation and My stuff

Tabs: **Browse · Domis · Give · My stuff**, shown as icons only. Each tab has the same header: the Domi wordmark, your initial top right, then a title and a subtitle. **Domis** ("Your domis", subtitle "Your neighborhood, and the people you choose") shows your neighborhood (📍) as a Fog card (a few neighbors' initials and "12 offers · 3 wishes this week"), then your invite-only circles, one row each ("38 neighbors · 4 new offers", or "quiet this week"), then Start a circle and Join with a code. "New" means other people's available offers and open wishes posted to that circle in the last 7 days, blocked people left out (`communities.overview`). With only the home circle, a Blush panel ("Share with people you already know") offers Start a circle, I have a code, and a few one-tap ideas that prefill the form. Tapping the wordmark replays How Domi works. Your initial opens **You**: name, zip and circle count (Edit → Edit profile), Thank-yous, Notifications, Blocked people, Terms of Service, Privacy Policy, Sign out, Delete account. (The GeoNames credit is in the Privacy Policy.) Browse (Offers / Wishes) and My stuff (Giving / Getting) use the same underlined text tabs.

My stuff has two sides, **Giving** and **Getting**. Each thing is one row: photo, title, and one plain status line. A row that needs you has a Bay status line and a small dot, and sorts first; the side and the tab show a dot (never a count or red badge) when anything needs you. It opens on the side that needs you. Endings (picked up, went to someone else) stay for 3 days at the bottom, then drop off. Served by `mystuff.giving`, `mystuff.getting`, `mystuff.needsYou`.

| Side | Situation | Status line | Needs you |
| --- | --- | --- | --- |
| Giving | available, people asked | "3 people asked. Choose one." | yes |
| Giving | available, no requests | "No requests yet" | |
| Giving | private offer, waiting | "Offered for Maya's wish. Waiting for them to choose." | |
| Giving | private offer, wisher picked another | "Maya's set for now. Yours is ready if plans change." | |
| Giving | offer declined or wish came true elsewhere (3 days) | "Maya: “<note>”" / "Maya's all set. Thanks for offering!", plus "Share with others" | ended |
| Giving | pending, unread message | "New message from Maya" | yes |
| Giving | pending | "Going to Maya" | |
| Giving | expired | "Expired. Tap to post again." | |
| Giving | gone (3 days) | "Picked up by Maya" | ended |
| Getting | chosen, haven't replied | "It's yours! Reply to plan pickup." | yes |
| Getting | chosen, unread message | "New message from Ellen" | yes |
| Getting | chosen, talking | "Pickup with Ellen" | |
| Getting | asked, waiting | "You asked. Ellen hasn't chosen yet." / "…on hold for someone else." / "…the listing has expired." | |
| Getting | my wish, offers in | "2 neighbors offered one" | yes |
| Getting | my wish, no offers | "No offers yet" | |
| Getting | ended (3 days) | "Picked up. Enjoy!" / "Went to someone else" / "No longer available" | ended |

The circle page: emoji, name, description, "8 neighbors · started by Maya", one Invite button, the neighbor list (the owner marked "Started it"; the owner can tap someone to remove them), and quiet Leave (and Delete for the owner) links.

## Data model (Convex)

User ids are Convex Auth `users` ids. All timestamps are milliseconds since epoch. Status values are typed unions in `convex/schema.ts`.

- `profiles` (userId, displayName, zip, approxLat, approxLng, avatarStorageId?, termsVersion, termsAcceptedAt, bannedAt?, zipChangedAt?)
  - One per user, created only by `profiles.completeSignup`. A signed-in user without a profile is sent to onboarding.
  - zip changes only through `profiles.changeZip`, at most once per 30 days. The first change after signup is free; moving the pin within the same zip doesn't count. `zipChangedAt` records the last change; `profiles.me` and `previewZipChange` return `nextZipChangeAt` / `nextChangeAt` so the app can say when.
- `zipCodes` (zip, city, state, lat, lng): US reference data, loaded once with `scripts/import-zips.mjs`. Signup and zip change reject unknown zips. Zip circles are named "City · 94610".
- `communities` (name, emoji, description?, kind: 'zip' | 'custom', zip?, createdBy?, memberCount)
  - kind 'zip': one per zip, created on demand, no owner, no invites.
  - kind 'custom': name and emoji required.
- `memberships` (communityId, userId, role: 'owner' | 'member', invitedBy?, inviteId?, muted, joinedAt)
  - Zip-circle memberships are created and removed only by signup, zip change and account deletion.
  - If a custom circle's owner leaves or deletes their account, ownership passes to the longest-standing member; a circle with no members is deleted.
- `communityBans` (communityId, userId): written when the owner removes a member, so the person cannot rejoin through an invite.
- `invites` (code, communityId, inviterId, revokedAt?): one active link per member per custom circle. Regenerate revokes the old one.
- `items` (ownerId, title, description, photos: storage ids (full size, item detail only), thumbs?: storage ids (~600 px, same order, for feeds and lists; missing on older listings, which fall back to the full photo), approxLat, approxLng, visibility: 'public' | 'private', wishlistItemId?, status: 'available' | 'pending' | 'gone' | 'expired' | 'removed', expiresAt, updatedAt, searchText, photosPurgedAt?, thankedAt?, thankNote? (unused: the first domi flower version; dev data only))
  - visibility is 'private' if and only if wishlistItemId is set; private items are offers to a wish and are not posted to circles.
  - approxLat/approxLng are copied from the owner's profile when posting.
  - 'removed' is a soft delete so requests, threads and events stay intact. Account deletion hard-deletes.
  - Photos of items that ended (gone, removed, or expired and not reposted) are deleted 30 days later by a cron job, thumbnails included.
  - Uploads must be images, at most 2 MB (thumbnails 300 KB). Upload URLs are limited to 60 per person per hour. Uploads not attached to a listing within a day are deleted by a daily cron job.
- `itemCommunities` (itemId, communityId): public items only.
- `itemShares` (itemId, sharerId, code, expiresAt, usedBy?, usedAt?, revokedAt?): owner only. Single use: good for one request. Several active links per item (cap 5), one per person the owner sends it to.
- `shareGrants` (shareId, itemId, userId): written when someone opens a share link (at signup or later). Gives a look at that one item while the link is unused; the first request through it uses the link up (`itemShares.usedBy`), after which only that person keeps access through it.
- `requests.viaShareId?`: set when a request was made through a share link; the owner sees "via your link".
- `profiles.shareIntroSeenAt?`: the one-time "One link, one person" sheet was shown.
- `wishlistItems` (userId, title, description?, status: 'open' | 'fulfilled' | 'removed')
- `wishlistCommunities` (wishlistItemId, communityId)
- `requests` (itemId, requesterId, note?, status: 'open' | 'selected' | 'withdrawn' | 'cancelled' | 'closed', updatedAt)
  - One per (item, requester); requesting again after withdrawing reopens the same row.
  - At most one 'selected' per item.
  - 'open' requests wait in line while the item is pending; if the pick falls through they are still there.
  - 'cancelled' = the owner un-picked this recipient. 'closed' = the item ended (gone or removed) without them.
  - Cap: 5 open requests per user on items that are available or pending. Wisher requests created by picking an offer start as 'selected' and don't count.
  - Owners cannot request their own items.
- `conversations` (itemId, requestId, ownerId, recipientId, closedAt?, lastMessageAt?): created when a request becomes 'selected'; closed when the selection falls through (un-pick, withdraw, removal, block). It stays open after the item is picked up. A new pick opens a new conversation. Closed conversations stay readable to both people, except while one has blocked the other.
- `messages` (conversationId, senderId, body, readAt?): inserts refused when the conversation is closed.
- `events` (recipientId, type, actorId?, itemId?, requestId?, conversationId?, wishlistItemId?, communityId?, title, body, readAt?, pushedAt?)
- `pushTokens` (userId, token, platform)
- `reports` (reporterId, targetType: 'item' | 'user' | 'message' | 'wishlist_item', targetId, reason, status: 'open' | 'reviewed' | 'dismissed')
- `blocks` (blockerId, blockedId)
- `noShows` (requesterId, ownerId, itemId, requestId, at): one row per missed pickup, written when the owner un-picks with `noShow`. Private: nobody sees it in the app. See "Missed pickups".

Location: store only rounded coordinates (3 decimal places), never a street address. The owner shares the exact address in the thread after picking a recipient.

### Signup (`profiles.completeSignup`, one mutation)

1. Require the current terms version; store termsVersion and termsAcceptedAt.
2. Validate the zip; create the profile (location from the pin if given, else the zip centroid, rounded).
3. Find or create the zip circle and add a membership.
4. Redeem any invite codes and share codes the app saved before signup. Invalid codes are skipped and reported back.
5. Write a "joined via invite" event to each inviter.

### Wish offers

1. A member who can see a wish offers an item: a private listing linked to the wish, status 'available'. The wisher gets an event.
2. Offers accumulate. Only the offerer and the wisher see an offer.
3. The wisher picks one offer (`wishlist.pickOffer`): a 'selected' request is created for the wisher, the offer becomes 'pending', and a conversation opens. Only one offer per wish can be pending at a time. While an offer is pending, the wish shows as pending pickup to everyone else and takes no new offers in the app (`wishCard.pending`); offers already made wait.
4. If the pick falls through (wisher withdraws, offerer un-picks), the offer goes back to 'available' and the wisher can pick again.
5. When the picked offer is marked picked up, the wish becomes 'fulfilled' and the other offers are removed, with an event to each offerer.
6. If the wisher removes the wish, open offers are removed and offerers are notified.
7. **No thanks** (`wishlist.declineOffer`): the wisher can turn down an offer that's waiting ('available'), from the bottom bar next to Take, or from "Other offers" while another is picked. An optional note (140 characters, screened). The offer becomes 'removed' with `declinedAt` / `declineNote`; its offerer gets an `offer_declined` event ("Maya: “note”" or "Maya's all set. Thanks for offering!") that pushes only when there's a note, and can't offer on that wish again. A picked offer is withdrawn with "I can't take it" instead.
8. Copy for offers that weren't taken stays gentle: being declined without a note and the wish coming true with another offer read the same ("Maya's all set"); never "not picked" or "declined".
9. **Editing a wish** (`wishlist.update`, 2026-11-08), modeled on editing a listing: the wisher edits the words, note and domis while the wish is open (a picked offer included), from the edit button on their wish (the listing's square-and-pencil). Adding and editing both use the listing editor in wish mode (`ListingEditor kind="wish"`, `app/wish/new.tsx`, `app/wish/edit/[id].tsx`): no photo or Free sticker, "What are you looking for?". Nobody is told about an edit, offers stay put, and new listings are matched against the new words from then on. A domi can't be dropped once someone in it has offered. Notes are up to 1,000 characters, like listing details.
10. **Share with others**: an offer that ended this way (photos not yet purged) can be posted as an ordinary public listing from its row in My stuff or its screen (`app/listing/again/[id].tsx`, the listing editor prefilled). `items.create` with `fromOfferId` moves the photos: the old offer gets `sharedAgainAt` and `photosPurgedAt`, so the photo cleanup leaves the shared files alone, and files the new listing didn't keep are deleted. Once per offer.

### Leaving a circle (shared by leave, remove member, delete circle, zip change, account deletion)

1. Remove the membership (and adjust memberCount).
2. Unpost the user's items from that circle. An available, pending or expired public item left with no circles becomes 'removed' (requesters are notified).
3. The user's 'open' or 'selected' requests on items they can no longer see become 'withdrawn'. If one was 'selected', its conversation closes, the item goes back to 'available', and the owner is notified.
4. Unpost the user's wishes from that circle; a wish left with no circles becomes 'removed'.

Zip change runs this for the old zip circle, then joins the new one and updates the profile. `profiles.previewZipChange` returns the counts first so the app can confirm ("This will cancel 2 listings and 1 request in 94610"). Private offers and share grants are unaffected.

### Missed pickups (`items.unpick` with `noShow: true`)

The owner un-picks with "<name> didn't show" (chat sheet, or the un-pick prompt on the listing). It works like an un-pick (item back to available, line intact, chat closes) and also writes a `noShows` row. The former recipient is told "Ellen said the pickup for the crib didn't happen, so it's available again."

Missed pickups with two or more different owners within 30 days pause that person's new requests and offer picks (`requests.create`, `wishlist.pickOffer`) until 7 days after the latest one. Two different owners, so one unhappy neighbor can't pause someone alone. Pickups already under way are unaffected. Nothing is shown publicly and rows age out on their own. Constants and checks: `convex/lib/noShows.ts`. This is a limit, not karma: no score, no public signal.

### Domi flower (`thanks.send`, one mutation)

A thank-you from the person who got an item to the person who gave it: the poppy on a stem, called a "domi flower" in the app. It belongs to the pickup itself, not to the start of the chat, and it's always optional.

- **"I just picked this up, thank you so much":** while the item is pending, once the recipient has sent at least one message, a quiet Blush strip sits above the message box ("Picked it up? Send Ellen a thank-you.", with × to hide it for now). It opens a sheet with the flower, an optional note (140 characters, screened like other text) and "Send a domi flower".
- **"I appreciate this":** when the owner marks it picked up, the recipient gets an informational push ("Enjoy the crib!" / "Ellen marked it picked up.") that opens the chat. If no flower has been sent, the chat shows an "Enjoy the crib!" card with "Send a domi flower" and "Not now". My stuff doesn't nudge: the row stays "Picked up. Enjoy!".
- **Sent:** the flower blooms open once and stays in the thread at the time it was sent ("Sent to Ellen", later "You sent Ellen a domi flower"). The owner gets a `thanked` push ("Maya sent you a domi flower" / the note) and sees the flower large in the thread; while the item is still pending it also offers "Maya has it? Mark it picked up". My stuff never repeats it in words: on both sides a sent flower is just a small icon beside the usual status line.

Stored on the conversation (`conversations.thankedAt`, `thankNote`), so it's one per handoff even if the item is later picked for someone else. Rules: only the conversation's recipient, only while the item is pending or gone with that conversation's request still selected, only while the conversation is open, only once, not after a block. Hiding the strip or card lasts for that visit. Counted for the group, never a person: each domi page shows a quiet Blush line ("9 domi flowers shared here", all time, hidden at zero) from `communities.flowerCount`, which `thanks.send` adds 1 to in each domi where the item was listed (for an offer on a wish, where the wish was posted) **and both the giver and the person who got it are members**. A handoff with no such domi (e.g. through a share link) counts nowhere. Counts never go down (leaving, blocking, removal); `thanks:recountFlowers` recomputes them from scratch if the rule changes. No profile totals, no rankings, no comparisons between domis.
- **You › Thank-yous** (`thanks.received`, `app/thanks.tsx`): the giver's own flowers, newest first, each with who sent it, for what, and the note; tapping one opens that chat. Private to the giver, never counted, and people blocked either way are left out.

### Account deletion (`profiles.deleteAccount`)

Runs "leaving a circle" for every circle, removes the user's remaining items and wishes (notifying requesters and offerers), then hard-deletes everything that belongs to the user: profile, items and their photos, requests, wishes, conversations they took part in and their messages (for both sides), events addressed to them, invites, shares, grants, blocks, reports they filed, push tokens, and their Convex Auth rows. Events where they were the actor keep their copy but lose the link to them.

## Access rules (enforced in Convex functions)

Enforced at the top of every public function (helpers in `convex/lib/access.ts`):

- A user sees circles they belong to.
- A user sees a public item when it is posted to a circle they belong to, or they opened a share link for it that is still unused, or used it themselves (`lib/shares.ts`). The owner always sees their own items. A removed item stays visible to its owner and to people who requested it.
- A private item (offer) is visible only to its owner and the wisher.
- Only the item owner edits, removes, picks, un-picks, marks picked up, reposts or shares an item.
- A user sees wishes posted to circles they belong to, and always their own.
- A requester sees and withdraws their own requests. The owner sees all requests on their items, including notes.
- Only the two participants read a conversation, and post only while it is open.
- A user reads only their own events and push tokens.
- Blocking works both ways: neither sees the other's items or wishes, neither can request from or message the other. Blocking withdraws open and selected requests between them and closes their conversations.
- Any member of a custom circle can create an invite; no one can for a zip circle. Banned (removed) members cannot redeem invites to that circle.
- Photos are served with Convex storage URLs, which only access-checked queries hand out. The shared-listing web page shows its photo through the Worker (`/p/<code>`), which checks `shares.preview` on every request and caches only the image bytes. URLs don't expire; deleting the photo (30 days after the item ends) revokes them.
- Public (signed-out) functions: `invites.preview` and `shares.preview` only. A share preview shows title, description, first photo and circle name while the item is available or pending; otherwise "no longer available".

## Item state machine and events

Every state change writes its events in the same mutation. Each event has its recipient's own copy.

| Transition | Trigger | Event to | Copy example |
| --- | --- | --- | --- |
| request created | requester taps Ask for it | owner | "Maya asked for your crib" |
| available → pending | owner picks recipient | recipient | "The crib is yours! Message Ellen to plan pickup." |
| available → pending | owner picks recipient | other open requesters | "The crib is pending with someone else. You're still in line." |
| pending → available | owner un-picks | former recipient | "Ellen has cancelled this exchange." (push title: the crib) |
| pending → available | owner marks a no-show | former recipient | "Ellen said the pickup for the crib didn't happen, so it's available again." |
| pending → available | recipient withdraws, or leaves/zip change withdraws them | owner | "Maya can't take the crib anymore" |
| pending → gone | owner taps Mark picked up | recipient (pushes, opens the chat) | "Enjoy the crib!" / "Ellen marked it picked up." |
| pending → gone | owner taps Mark picked up | open requesters | "The crib went to someone else this time." |
| any → removed | owner removes, or a circle change leaves it with no circles | open and selected requesters | "The crib is no longer available" |
| available → expired | 30 days, cron | owner | "Your crib listing expired. Repost?" |
| available → expired | 30 days, cron | open requesters | "The crib listing expired" |
| new message | either side, open conversation | other participant | "New message about the crib" |
| offer created | someone offers an item for a wish | wisher | "Sam offered a stroller for your wish" |
| offer picked | wisher picks an offer | offerer | "Maya chose your stroller! Message Maya to arrange pickup." |
| offer un-picked | wisher withdraws | offerer | "Maya can't take the stroller anymore" |
| wish fulfilled elsewhere / wish removed | another offer picked up, or wish removed | other offerers | "Maya's wish was fulfilled" / "Maya doesn't need one anymore. Thanks for offering." |
| joined via invite | invite redeemed | inviter | "Sam joined 🍼 Baby Shower" |
| domi flower | recipient sends a thank-you (pending or picked up) | owner | "Maya sent you a domi flower" / the note, or "A thank-you for the crib." |

Push sending (M5, details in `docs/m5-requirements.md`): only events with an action push. Inserting one sets `pushDueAt` and schedules `push.flush`, which claims due events, sends through the Expo push API in batches and sets `pushedAt`. Chat messages merge. Circle activity (new listings and wishes) pushes as `circle_activity` events: 5 welcome pushes per circle joined, then back-off; per-circle mute applies only to these.

## Invite links

- URL: `https://<domain>/c/<code>`. Codes are 8 characters, Crockford base32 (no I, L, O, U), case-insensitive; dashes and spaces are ignored when typed.
- Universal Links (iOS) and App Links (Android) open the app if installed. Otherwise the landing page shows the circle's emoji, name, description and member count, store buttons, and the code.
- The app saves invite codes it receives before signup and redeems them all during signup. On first launch after sign-in it asks "Have an invite code?".
- Each member's link is their own and can be regenerated. Zip circles have no invite links.

## Listing share links

Decided 2026-11-02, built on branch `share-links-single-use`. A share link lets exactly one person request a listing, even if they share no circle with the owner. It is for one person the owner has in mind (a friend, someone answering a wish on Buy Nothing), not for posting to a group. Broadcasting is for bringing people into Domi (flyers, campaign links), never for single items.

### Rules

- **One link per person.** Each tap of "Share outside Domi" makes a new link (`shares.create`). Links are never reused. At most 5 unused links per listing; making a sixth revokes the oldest.
- **The request uses up the link, not the visit.** Opening a link writes a `shareGrants` row, which lets that person see the listing while the link is unused. The first request made through it sets `itemShares.usedBy` / `usedAt` and records `requests.viaShareId`. After that only that person keeps access through the link; anyone else who opened it loses it and is told the link was used.
- **Nothing is reserved.** The listing stays in its circles, circle members can still request, and the owner picks the recipient as usual. The link only lets one more person into the line.
- **A leaked link is harmless.** A stranger who uses it is just one more requester the owner doesn't pick. The owner taps Share again for a new link.
- **Links close** when used, 14 days after creation, or when the listing is gone, removed or expired. A pending listing keeps its links live, since requests wait in line while an item is pending. Links made before 2026-11-02 have no `expiresAt` and are treated as closed.
- Owner only, on public listings. The app offers Share on available listings (the backend also allows pending).
- Someone already in one of the listing's circles can use a link too. Their request records the link, but the owner sees "via your link" only for people outside the listing's circles (2026-11-08: the mark told owners nothing for their own neighbors). Withdrawing and asking again keeps the record.
- A newcomer from a link joins their own zip circle as usual. The link gives them that one listing, never the owner's circles.

### Flows

**Giver**
1. Taps Share (the share icon on their listing photo, or "Share outside Domi" on the posted screen).
2. First time only: the "One link, one person" sheet (below). "Got it, share" marks it seen (`shares.markIntroSeen`, `profiles.shareIntroSeenAt`).
3. The phone's share sheet opens with: "I'm giving away my <title>. Ask for it on Domi with this link and I'll see it. <url>".
4. Requests through the link show "· via your link" in the ask list. The owner picks as usual.
5. After marking it picked up, if the recipient came through a link and they share no custom circle, the circle nudge shows on the listing (`shares.circleNudge`).

**Recipient**, by situation:

| Situation | What happens |
| --- | --- |
| Has Domi, signed in | The link opens the app (Universal Links: `applinks:domicircles.com`, `/i/*`). `app/i/[code].tsx` redeems it and opens the listing; they request as usual. |
| Has Domi, signed out | The app saves the code and sends them to sign in; `useRedeemSavedCodes` redeems it and opens the listing. |
| No Domi | The web page (`/i/<code>`) shows the listing and the TestFlight install steps. After install, the app saves the code; signup (`profiles.completeSignup`) redeems it and the app opens the listing under the "How Domi works" cards (`src/features/auth/landing.ts`). |
| Link opened in a browser (in-app browsers such as Facebook's, a pasted link, long-press Open) | The web page shows; its "See it in Domi" button opens the app at `domi://i/<code>`. |
| Link already used or expired | App and web say "This link was already used." / "This link has expired." plus "Ask <owner> to send you a new one." Requesting through a used link fails with the same message. |
| Listing ended | Existing "This one has already found a home." |

### Screens and copy

Only these change; everything else is existing UI.

| Where | New or changed | Copy |
| --- | --- | --- |
| Share sheet, first share only | New content in the existing `Sheet` | Title "One link, one person". "Each link lets one person ask for your <title>, even if you don't share a circle." "Sharing with a few friends? Send each one their own link. Your circle can still ask too, and you choose who gets it." Button "Got it, share". |
| Share message | Changed | "I'm giving away my <title>. Ask for it on Domi with this link and I'll see it." |
| Owner's ask rows (available and in line) | New meta text | "<name> · 2h · via your link" |
| Owner's listing after pickup | New card below "Picked up by <name>" and the chat link, built from the existing Card and buttons | "Swap with <name> often?" + "You don't share a circle yet. Circles can include people outside your zip." / Invite to a circle (Circles tab) / Not now. With no custom circles: "Start a circle for friends and family…" / Start a circle (circle form). "Not now" hides it for that visit. |
| Web listing page and the app's link screen | One added line | "<owner> picks who gets it." |
| Web missing page and the app's link screen | New copy for used and expired links | "This link was already used. Ask <owner> to send you a new one." |

Recipients aren't told about the one-ask limit up front; only the sharer is. There is no recipient name on links and no link-status UI for the owner.

### Backend

- `shares.create` (owner; rate limit `share`, 30/day), `shares.revoke` (closes all unused links on a listing), `shares.preview` (public; unavailable states carry `reason: "used" | "expired" | "gone"` and `ownerName`), `shares.redeem` (signed in; returns `used` / `expired` / `unavailable` / `revoked` / `invalid`), `shares.markIntroSeen`, `shares.circleNudge`.
- `requests.create` uses up a link the requester opened; `requests.forItem` returns `viaLink`.
- Access: `canSeeItem` uses `usableShareFor` (`convex/lib/shares.ts`).
- Tests: `convex/shares.test.ts`, `web/src/index.test.mjs`.

### Later

- Credit sharers ("3 people joined from your links").
- Suggest a circle when the owner has sent links to the same people two or three times.
- Tie a link to the recipient's phone number once phone sign-in exists.

## Decisions log

- Sign-in: Apple + Google at launch; phone OTP later behind a flag.
- Keep default zip-code circles alongside invite-only custom circles.
- Location: coarse map pin if low effort, zip centroid as fallback.
- User-facing name for communities: "circle".
- Owner picks the recipient; no first-come-first-served.
- Fresh start: no data or user migration from Corcles.
- Requests carry an optional note of up to 140 characters; messaging starts only after selection.
- Zip code is editable, with a confirmation of what will be cancelled.
- Any member of a custom circle can invite others.
- Terms of service must be accepted at signup. Terms and privacy policy live at domicircles.com/terms and /privacy (`web/src/legal.js`); `terms_version` in `convex/init.ts` is their effective date.
- Circles have an optional description.
- Private wishes are out of scope; only private offers exist.
- Profile photo field exists; upload is deferred.
- 2026-10-16: Backend moved from Supabase to Convex.
- 2026-10-21: Status changes happen only through dedicated mutations.
- 2026-10-21: Account deletion is immediate and hard (required by the App Store and Google Play). A grace period or "deactivate" can come later.
- 2026-10-21: When a pick falls through, the other requests are still open; nobody has to request again.
- 2026-10-21: Requests are allowed while an item is pending; they wait in line.
- 2026-10-21: Members can leave custom circles. The circle owner is its admin: remove members (they can't rejoin by invite) and delete the circle.
- 2026-10-21: Photos use Convex storage URLs handed out only by access-checked queries, deleted 30 days after the item ends. Items have a list of photos.
- 2026-10-21: Zip codes are validated against a US reference table.
- 2026-10-21: Block hides everything both ways.
- 2026-10-21: Invite and share codes are 8-character Crockford base32.
- 2026-10-21: Owners can share a listing outside Domi; redeeming the link lets a newcomer request that listing (supports posting in a Buy Nothing group). Supersedes "read-only item share pages" being out of scope.
- 2026-10-21: Wish offers accumulate and the wisher picks one (as in Corcles); several people may offer.
- 2026-10-24 (M4b design review): A wish with a picked offer shows as pending to others, like a pending listing. The wisher chooses an offer, then confirms (same pattern as picking a requester). An offer is shown to its giver as an ordinary listing, not a separate page. Browse › Wishes is a board of cards like Offers, with your own wishes on it.
- 2026-10-21: Repost reopens the same listing with a fresh 30 days; requests that were open stay open.
- 2026-10-21: Listings expire after 30 days.
- 2026-10-25: Circles get their own tab (Browse · Circles · Give · My stuff), moved out of You, because circles are central to Domi and were too hidden there. Supersedes the 2026-10-21 tab decision below.
- 2026-10-21: Tabs are Browse · Give · My stuff (replaces Browse · Give · Activity · You, after two rounds of mock usability tests). You (profile, circles, settings) opens from the My stuff avatar. There is no separate Activity feed in the app; push still reads `events`. Browse keeps its current design.
- 2026-10-21: Muting a circle is out of the MVP screens (the backend field stays). The circle page has no "new invite link" button.
- 2026-10-21: Opening an invite link while signed in shows a confirmation card before joining.
- 2026-10-24 (M3 design review): Posting is optimized for one photo; up to 3 per listing. Give opens the camera in one tap (library one tap away).
- 2026-10-24: The new listing is written as a "placard" (edited in place, looking the way neighbors will see it). Description is optional.
- 2026-10-24: New listings default to the home (zip) circle; "Change" picks others.
- 2026-10-24: After posting, a Blush "Your lamp is out there" screen that says requests show up in My stuff. Owners see their own listings on Browse, marked "Yours".
- 2026-10-24: The owner's listing has Edit and Share outside Domi in the action bar, Remove below, and copy saying they'll pick one person. Item photos swipe, with dots.
- 2026-10-24 (M4 design review): Copy for the person picked is neutral ("The crib is yours!"), not "Ellen chose you", so not being picked stings less and random selection can come later. Chats stay open after pickup. Ended chats stay readable.
- 2026-10-21: Links live on domicircles.com (Cloudflare Worker). Until launch the pages say Domi is in private testing and show the code to enter.
- 2026-11-02: Share links are single use: one link per person, used up by the first request made through it (not by opening it). The listing stays in its circles and the owner still picks; nothing is reserved. Links die when the item ends (gone, removed, expired) or after 14 days; pending items keep them live. No public or group share links for items; broadcast is for joining Domi (flyers, campaign links), never for single items. Replaces reusable links; `shareGrants` stays as the look-before-requesting access. Considered and rejected: a few claims per link (confusing to explain), tying links to a phone number (too heavy; revisit with phone sign-in).
- 2026-11-02: Zip changes limited to one per 30 days (first change after signup free), so one zip per account holds without address verification. Missed pickups: owners can mark a no-show; two with different owners in 30 days pause requests for 7 days. Chosen instead of address verification and karma: measure flakiness directly, keep it private.
- 2026-11-06: Domi flower (thank-you poppy): one per handoff, sent by the person who got the item from pickup time on (before or after it's marked picked up), note optional, private to the two of them. "Picked up" now pushes to the recipient, informational only, so the flower is one tap away without being asked for. Domi's brand moves from the ring to the leaning poppy, and user-facing copy says "neighborhood" and "domi" instead of "circle" (`docs/brand-strategy.md`).
- 2026-11-07: Logo style A (one-color petals with gaps). The neighborhood keeps its 📍 (no flower). Member counts say "members" and the invite button "Invite someone" (domis aren't only neighbors). Each domi page shows its all-time domi flower count, quietly.
- 2026-11-08: A domi flower counts only in domis where the item was listed and both people are members (not every domi it was listed in).
- 2026-11-08: Wish offers get "No thanks" with an optional note (push only with a note), no re-offer on that wish, gentle "all set" copy for every offer that wasn't taken, "set for now" while another offer is being picked up, and "Share with others" to post an ended offer publicly. Considered and rejected: quick-reply chips for the note (kept the sheet slim).
- 2026-11-08 (gratitude audit): You › Thank-yous keeps the flowers a giver received in one place (no count). The request note's placeholder starts with a thank-you; the intro's wish card mentions the domi flower. Copy: "Ask for it" / "Maya asked for your crib"; un-pick says "Ellen has cancelled this exchange."; requesters not picked hear "The crib went to someone else this time."; offerers on a removed wish hear "Maya doesn't need one anymore. Thanks for offering." Considered and left out: a "thanks anyway" from requesters who weren't picked, and a note when backing out (the chat covers it).
