# Domi MVP spec

## The core loop

A member posts an item to one or more circles. Neighbors ask about it, each in a private thread with the owner. The owner picks a recipient from everyone who asked. They arrange pickup in their thread. The owner marks it picked up.

## In scope

| Area | MVP |
| --- | --- |
| Accounts | Sign in with Apple and Google. Display name, zip code, optional coarse location pin. In-app account deletion. |
| Circles | Custom circles with a name and one emoji. Invite links. Member list. A default circle per zip code. |
| Listings | Camera-first posting: photo, title, description, approximate area. Post to several circles. |
| Browse | Feed per circle, item detail, simple keyword search, "Looking for" posts. |
| Messaging | One private thread per item per asker. Realtime, text only. Block and report. |
| Lifecycle | Available → Pending → Gone, or Expired. Owner picks a recipient from a list of everyone who asked, then taps "Mark picked up". |
| Notifications | Push and an Activity tab, both fed by `events`. At most one circle digest per day. Per-circle mute. |
| Growth | Invite links that land people in the right circle, with a web landing page for people without the app. |
| Safety | Report and block, manual review in Supabase Studio, cap on open requests per user. |

## Out of scope for MVP

Paid listings, bidding, price cuts, payments, escrow, karma/points, calendar scheduling UI, private wishlists, phone OTP, email or Facebook login, read-only item share pages, AI features.

## Data model

- `profiles` (id = auth user id, display_name, zip, approx_lat, approx_lng, created_at)
- `communities` (id, name, emoji, kind: 'zip' | 'custom', zip, invite_code, created_by)
- `memberships` (community_id, user_id, role: 'owner' | 'member', invited_by, muted)
- `items` (id, owner_id, title, description, photo_path, approx_area, status: 'available' | 'pending' | 'gone' | 'expired', recipient_id, expires_at)
- `item_communities` (item_id, community_id)
- `looking_for` (id, user_id, community_id, text, status)
- `conversations` (id, item_id, owner_id, asker_id) unique on (item_id, asker_id)
- `messages` (id, conversation_id, sender_id, body, created_at, read_at)
- `events` (id, recipient_id, type, item_id, conversation_id, actor_id, title, body, created_at, read_at, pushed_at)
- `push_tokens` (user_id, token, platform)
- `reports` (id, reporter_id, target_type, target_id, reason, status)
- `blocks` (blocker_id, blocked_id)

Location: store only rounded coordinates (about 3 decimal places), never a street address. The owner shares the exact address in the thread after picking a recipient.

## Access rules (RLS)

- A user sees circles they belong to, and items posted to those circles.
- Only the item owner can edit an item or change its status.
- Only the two participants can read or write a conversation and its messages.
- A user reads only their own events and push tokens.
- Blocked users cannot start or post in conversations with the blocker.
- Invite redemption runs in an edge function so it can add a membership from a code.

## Item state machine and events

| Transition | Trigger | Event to | Copy example |
| --- | --- | --- | --- |
| first message from an asker | asker sends a message | owner | "Maya asked about your crib" |
| new message | either side | the other participant | "New message about the crib" |
| available → pending | owner picks recipient | recipient | "You were picked for the crib! Arrange pickup." |
| available → pending | owner picks recipient | other askers | "The crib went to someone else" |
| pending → available | owner un-picks | former recipient | "The crib is available again" |
| pending → gone | owner taps Mark picked up | recipient | "Hope you enjoy the crib" |
| available → expired | 14 days, pg_cron | owner | "Your crib listing expired. Repost?" |
| joined via invite | invite redeemed | inviter | "Sam joined 🍼 Baby Shower" |

Push sending: a database webhook on `events` insert calls an edge function, which looks up `push_tokens`, sends via the Expo push API, and sets `pushed_at`. Respect per-circle mute and the daily digest cap.

## Invite links

- URL: `https://<domain>/c/<invite_code>`. Universal Links (iOS) and App Links (Android) open the app if installed.
- If not installed: landing page shows the circle's emoji, name, and member count, store buttons, and the code.
- On first launch after sign-in, the app asks "Have an invite code?" as a fallback.
- Creator can regenerate the code.

## Decisions log

- Sign-in: Apple + Google at launch; phone OTP later behind a flag.
- Keep default zip-code circles alongside invite-only custom circles.
- Location: coarse map pin if low effort, zip code as fallback.
- User-facing name for communities: "circle".
- Owner picks the recipient; no first-come-first-served.
