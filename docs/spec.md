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
| Listings | Camera-first posting: title, description, one or more photos. Post to several circles. Edit or remove. See requests with notes, pick a recipient, un-pick, mark picked up. Repost an expired listing. |
| Share outside Domi | The owner can share a link to a listing (e.g. in a Buy Nothing group). The link opens a read-only page; someone who installs Domi from it can request that listing even if they are not in its circles. |
| Browse | Items and wishes in all my circles or one circle. Item detail. Keyword search. |
| Wishes | Post a wish to circles I'm in. Neighbors offer items for it (private listings). Offers accumulate; the wisher picks one. |
| Request | Request an item with an optional note (up to 140 characters). Requests are allowed while an item is pending: they wait in line and the app shows the item is pending. |
| Messaging | A thread opens when a recipient is picked; either side can message. |
| Profile | View and edit profile, including zip, with a confirmation that lists what will be cancelled in the old zip circle. |
| Lifecycle | Available → Pending → Gone, or Expired after 30 days, or Removed. |
| Notifications | Push, fed by `events`. In the app, the My stuff tab shows what needs you (see "My stuff"). At most one circle digest per day. |
| Growth | Invite links that land people in the right circle, with a web landing page for people without the app. Listing share links (above). |
| Safety | Report and block. Block hides each person's items, wishes and messages from the other. Manual review in the Convex dashboard. Cap of 5 open requests per user. `bannedAt` on profiles to suspend. |

## Out of scope for MVP

Paid listings, bidding, price cuts, payments, escrow, karma/points, calendar scheduling UI, private wishes, profile photo upload (field exists, unused), phone OTP, email or Facebook login (a dev-only password sign-in exists for testing and must never be enabled in production), AI features, migrating data or users from Corcles.

## Navigation and My stuff

Tabs: **Browse · Give · My stuff**. The avatar at the top of My stuff opens **You**: name and zip (Edit → Edit profile), Your circles (Start a circle, Join with a code), Terms and privacy, Sign out, Delete account. Browse (Free / Wishes) and My stuff (Giving / Getting) use the same segmented control.

My stuff has two sides, **Giving** and **Getting**. Each thing is one row: photo, title, and one plain status line. A row that needs you has a Bay status line and a small dot, and sorts first; the side and the tab show a dot (never a count or red badge) when anything needs you. It opens on the side that needs you. Endings (picked up, went to someone else) stay for 3 days at the bottom, then drop off. Served by `mystuff.giving`, `mystuff.getting`, `mystuff.needsYou`.

| Side | Situation | Status line | Needs you |
| --- | --- | --- | --- |
| Giving | available, people asked | "3 people asked. Choose one." | yes |
| Giving | available, no requests | "No requests yet" | |
| Giving | private offer, waiting | "Offered for Maya's wish. Waiting for them to choose." | |
| Giving | pending, unread message | "New message from Maya" | yes |
| Giving | pending | "Going to Maya" | |
| Giving | expired | "Expired. Tap to post again." | |
| Giving | gone (3 days) | "Picked up by Maya" | ended |
| Getting | chosen, haven't replied | "Ellen chose you. Reply to plan pickup." | yes |
| Getting | chosen, unread message | "New message from Ellen" | yes |
| Getting | chosen, talking | "Pickup with Ellen" | |
| Getting | asked, waiting | "You asked. Ellen hasn't chosen yet." / "…on hold for someone else." / "…the listing has expired." | |
| Getting | my wish, offers in | "2 neighbors offered one" | yes |
| Getting | my wish, no offers | "No offers yet" | |
| Getting | ended (3 days) | "Picked up. Enjoy!" / "Went to someone else" / "No longer available" | ended |

The circle page: emoji, name, description, "8 neighbors · started by Maya", one Invite button, the neighbor list (the owner marked "Started it"; the owner can tap someone to remove them), and quiet Leave (and Delete for the owner) links.

## Data model (Convex)

User ids are Convex Auth `users` ids. All timestamps are milliseconds since epoch. Status values are typed unions in `convex/schema.ts`.

- `profiles` (userId, displayName, zip, approxLat, approxLng, avatarStorageId?, termsVersion, termsAcceptedAt, bannedAt?)
  - One per user, created only by `profiles.completeSignup`. A signed-in user without a profile is sent to onboarding.
  - zip changes only through `profiles.changeZip`.
- `zipCodes` (zip, city, state, lat, lng): US reference data, loaded once with `scripts/import-zips.mjs`. Signup and zip change reject unknown zips. Zip circles are named "City · 94610".
- `communities` (name, emoji, description?, kind: 'zip' | 'custom', zip?, createdBy?, memberCount)
  - kind 'zip': one per zip, created on demand, no owner, no invites.
  - kind 'custom': name and emoji required.
- `memberships` (communityId, userId, role: 'owner' | 'member', invitedBy?, inviteId?, muted, joinedAt)
  - Zip-circle memberships are created and removed only by signup, zip change and account deletion.
  - If a custom circle's owner leaves or deletes their account, ownership passes to the longest-standing member; a circle with no members is deleted.
- `communityBans` (communityId, userId): written when the owner removes a member, so the person cannot rejoin through an invite.
- `invites` (code, communityId, inviterId, revokedAt?): one active link per member per custom circle. Regenerate revokes the old one.
- `items` (ownerId, title, description, photos: storage ids, approxLat, approxLng, visibility: 'public' | 'private', wishlistItemId?, status: 'available' | 'pending' | 'gone' | 'expired' | 'removed', expiresAt, updatedAt, searchText, photosPurgedAt?)
  - visibility is 'private' if and only if wishlistItemId is set; private items are offers to a wish and are not posted to circles.
  - approxLat/approxLng are copied from the owner's profile when posting.
  - 'removed' is a soft delete so requests, threads and events stay intact. Account deletion hard-deletes.
  - Photos of items that ended (gone, removed, or expired and not reposted) are deleted 30 days later by a cron job.
- `itemCommunities` (itemId, communityId): public items only.
- `itemShares` (itemId, sharerId, code, revokedAt?): owner only; one active link per item.
- `shareGrants` (shareId, itemId, userId): written when someone redeems a share link (at signup or later). Lets that user see and request that one item.
- `wishlistItems` (userId, title, description?, status: 'open' | 'fulfilled' | 'removed')
- `wishlistCommunities` (wishlistItemId, communityId)
- `requests` (itemId, requesterId, note?, status: 'open' | 'selected' | 'withdrawn' | 'cancelled' | 'closed', updatedAt)
  - One per (item, requester); requesting again after withdrawing reopens the same row.
  - At most one 'selected' per item.
  - 'open' requests wait in line while the item is pending; if the pick falls through they are still there.
  - 'cancelled' = the owner un-picked this recipient. 'closed' = the item ended (gone or removed) without them.
  - Cap: 5 open requests per user on items that are available or pending. Wisher requests created by picking an offer start as 'selected' and don't count.
  - Owners cannot request their own items.
- `conversations` (itemId, requestId, ownerId, recipientId, closedAt?, lastMessageAt?): created when a request becomes 'selected'; closed when the selection ends. A new pick opens a new conversation.
- `messages` (conversationId, senderId, body, readAt?): inserts refused when the conversation is closed.
- `events` (recipientId, type, actorId?, itemId?, requestId?, conversationId?, wishlistItemId?, communityId?, title, body, readAt?, pushedAt?)
- `pushTokens` (userId, token, platform)
- `reports` (reporterId, targetType: 'item' | 'user' | 'message' | 'wishlist_item', targetId, reason, status: 'open' | 'reviewed' | 'dismissed')
- `blocks` (blockerId, blockedId)

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
3. The wisher picks one offer (`wishlist.pickOffer`): a 'selected' request is created for the wisher, the offer becomes 'pending', and a conversation opens. Only one offer per wish can be pending at a time.
4. If the pick falls through (wisher withdraws, offerer un-picks), the offer goes back to 'available' and the wisher can pick again.
5. When the picked offer is marked picked up, the wish becomes 'fulfilled' and the other offers are removed, with an event to each offerer.
6. If the wisher removes the wish, open offers are removed and offerers are notified.

### Leaving a circle (shared by leave, remove member, delete circle, zip change, account deletion)

1. Remove the membership (and adjust memberCount).
2. Unpost the user's items from that circle. An available, pending or expired public item left with no circles becomes 'removed' (requesters are notified).
3. The user's 'open' or 'selected' requests on items they can no longer see become 'withdrawn'. If one was 'selected', its conversation closes, the item goes back to 'available', and the owner is notified.
4. Unpost the user's wishes from that circle; a wish left with no circles becomes 'removed'.

Zip change runs this for the old zip circle, then joins the new one and updates the profile. `profiles.previewZipChange` returns the counts first so the app can confirm ("This will cancel 2 listings and 1 request in 94610"). Private offers and share grants are unaffected.

### Account deletion (`profiles.deleteAccount`)

Runs "leaving a circle" for every circle, removes the user's remaining items and wishes (notifying requesters and offerers), then hard-deletes everything that belongs to the user: profile, items and their photos, requests, wishes, conversations they took part in and their messages (for both sides), events addressed to them, invites, shares, grants, blocks, reports they filed, push tokens, and their Convex Auth rows. Events where they were the actor keep their copy but lose the link to them.

## Access rules (enforced in Convex functions)

Enforced at the top of every public function (helpers in `convex/lib/access.ts`):

- A user sees circles they belong to.
- A user sees a public item when it is posted to a circle they belong to, or they hold a share grant for it. The owner always sees their own items. A removed item stays visible to its owner and to people who requested it.
- A private item (offer) is visible only to its owner and the wisher.
- Only the item owner edits, removes, picks, un-picks, marks picked up, reposts or shares an item.
- A user sees wishes posted to circles they belong to, and always their own.
- A requester sees and withdraws their own requests. The owner sees all requests on their items, including notes.
- Only the two participants read a conversation, and post only while it is open.
- A user reads only their own events and push tokens.
- Blocking works both ways: neither sees the other's items or wishes, neither can request from or message the other. Blocking withdraws open and selected requests between them and closes their conversations.
- Any member of a custom circle can create an invite; no one can for a zip circle. Banned (removed) members cannot redeem invites to that circle.
- Photos are served with Convex storage URLs, which only access-checked queries hand out. URLs don't expire; deleting the photo (30 days after the item ends) revokes them.
- Public (signed-out) functions: `invites.preview` and `shares.preview` only. A share preview shows title, description, first photo and circle name while the item is available or pending; otherwise "no longer available".

## Item state machine and events

Every state change writes its events in the same mutation. Each event has its recipient's own copy.

| Transition | Trigger | Event to | Copy example |
| --- | --- | --- | --- |
| request created | requester taps Request | owner | "Maya requested your crib" |
| available → pending | owner picks recipient | recipient | "You were picked for the crib! Message Ellen to arrange pickup." |
| available → pending | owner picks recipient | other open requesters | "The crib is pending with someone else. You're still in line." |
| pending → available | owner un-picks | former recipient | "Ellen un-picked you for the crib" |
| pending → available | recipient withdraws, or leaves/zip change withdraws them | owner | "Maya can't take the crib anymore" |
| pending → gone | owner taps Mark picked up | recipient | "Hope you enjoy the crib" |
| pending → gone | owner taps Mark picked up | open requesters | "The crib has been picked up" |
| any → removed | owner removes, or a circle change leaves it with no circles | open and selected requesters | "The crib is no longer available" |
| available → expired | 30 days, cron | owner | "Your crib listing expired. Repost?" |
| available → expired | 30 days, cron | open requesters | "The crib listing expired" |
| new message | either side, open conversation | other participant | "New message about the crib" |
| offer created | someone offers an item for a wish | wisher | "Sam offered a stroller for your wish" |
| offer picked | wisher picks an offer | offerer | "Maya chose your stroller! Message Maya to arrange pickup." |
| offer un-picked | wisher withdraws | offerer | "Maya can't take the stroller anymore" |
| wish fulfilled elsewhere / wish removed | another offer picked up, or wish removed | other offerers | "Maya's wish was fulfilled" / "Maya removed the wish" |
| joined via invite | invite redeemed | inviter | "Sam joined 🍼 Baby Shower" |

Push sending (M5): inserting an event schedules a `sendPush` action that reads `pushTokens`, sends through the Expo push API and sets pushedAt, respecting per-circle mute and the daily digest cap.

## Invite links

- URL: `https://<domain>/c/<code>`. Codes are 8 characters, Crockford base32 (no I, L, O, U), case-insensitive; dashes and spaces are ignored when typed.
- Universal Links (iOS) and App Links (Android) open the app if installed. Otherwise the landing page shows the circle's emoji, name, description and member count, store buttons, and the code.
- The app saves invite codes it receives before signup and redeems them all during signup. On first launch after sign-in it asks "Have an invite code?".
- Each member's link is their own and can be regenerated. Zip circles have no invite links.

## Listing share links

- URL: `https://<domain>/i/<code>`, same code format. Owner only.
- The read-only page shows the listing while it is available or pending. If the visitor installs Domi, the app saves the code before signup and redeems it at signup, granting access to that listing so they can request it.

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
- Terms of service must be accepted at signup.
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
- 2026-10-21: Repost reopens the same listing with a fresh 30 days; requests that were open stay open.
- 2026-10-21: Listings expire after 30 days.
- 2026-10-21: Tabs are Browse · Give · My stuff (replaces Browse · Give · Activity · You, after two rounds of mock usability tests). You (profile, circles, settings) opens from the My stuff avatar. There is no separate Activity feed in the app; push still reads `events`. Browse keeps its current design.
- 2026-10-21: Muting a circle is out of the MVP screens (the backend field stays). The circle page has no "new invite link" button.
- 2026-10-21: Opening an invite link while signed in shows a confirmation card before joining.
- 2026-10-21: Links live on domicircles.com (Cloudflare Worker). Until launch the pages say Domi is in private testing and show the code to enter.
