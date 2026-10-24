# M4 requirements: picking, threads and safety

Agreed 2026-10-24. Wishes moved to their own milestone (M4b, below). Sources: `docs/build-plan.md` (M4), `docs/spec.md`, `CLAUDE.md` ("Wishes and wish fulfillment still run on mock data … until M4").

## Where we start

The M4 backend is built and tested: `conversations.ts`, `safety.ts`, `requests.forItem`, `items.selectRecipient / unpick / markPickedUp`, `wishlist.ts`, `mystuff.ts`, with tests for "a third account can't read the thread" and "block stops messages". **No screen calls any of these yet.** So M4 is mostly screens, plus a few small backend additions (R7).

Already live from M3: requesting, getting in line, and withdrawing on item detail; the owner's listing (status card, Edit, Share, Remove, Post again); My stuff rows (item rows open the listing, thread and wish rows go nowhere yet).

Still mock: Browse › Wishes, Add wish sheet, the Give tab's "Your circles are looking for" strip, and the fulfill flow (`src/features/wishlist/store.ts`, `src/features/items/mockData.ts`).

## Done when

1. Two devices chat in realtime (owner and picked recipient).
2. A third account cannot read or write the thread (test exists; keep it passing).
3. Block stops new messages, closes the thread, and hides each person's listings and wishes from the other (test exists; also checked on device).
4. Owner sees everyone who asked, picks one (item → pending, chat opens), can un-pick (→ available, line intact) and mark picked up (→ gone).
5. Typecheck and tests pass; each row committed.

## Requirements

### R1. Owner: who asked, and picking one (design: canvas "R1 v2b · Choose, then give", picked 2026-10-24)
- Keep the listing quiet: no status card, no privacy note, no per-row buttons or menus, no "Free" sticker on your own listing. Edit and Share outside Domi become icon buttons on the photo, so there's no action bar until you choose someone.
- Under the title: "3 neighbors asked" (Fraunces) and "Pick one to give it to." Then the people who asked, oldest first (`requests.forItem`): initial, name, how long ago, and the full note. Each row is a radio option.
- Choosing someone shows one Poppy button at the bottom, **Give to Maya**. Tapping the chosen row again clears the choice.
- **Give to Maya** opens the confirm sheet (canvas "R1 · Give to Maya?"), which is where the explanation lives: Maya's note, "A private chat opens with Maya to plan pickup. Sam and Priya stay in line in case it falls through.", then **Give to Maya** / **Not yet**. Confirming calls `items.selectRecipient` and opens the chat.
- With no one chosen, "Remove listing" stays a quiet link at the bottom.
- Report and block for someone who asked: long-press their row (R6).

### R2. Owner: pending, un-pick, picked up
- Pending listing, action bar: **Message Maya** (Bay, primary) and **Mark picked up**.
- Under it, a quiet **Un-pick Maya** link. Confirm: "Un-pick Maya? Your chat closes and the crib is available again. The 2 people in line can still be picked." → `items.unpick`.
- Mark picked up confirm: "Mark the crib picked up? The listing ends and everyone in line is told." → `items.markPickedUp`.
- People still in line show under "In line (2)" without Give buttons.
- Edit stays allowed while pending (the backend allows it); Share outside Domi is hidden while pending.

### R3. Requester side
- Item detail when you're picked: a Blush celebration card, "The crib is yours!" (neutral: never "Ellen chose you"), with **Message Ellen** as the primary button; Withdraw becomes **I can't take it** with a confirm ("Ellen will be told and can pick someone else").
- My stuff › Getting: rows with an open chat open the chat; others open the listing.

### R4. The chat screen (`app/chat/[id].tsx`)
- Header: back, the other person's name, a small item photo and title (tap → listing), and a "…" menu.
- Messages oldest first; mine on the right in Bay, theirs on the left in Fog; day separators and a time under each group. Live via `conversations.messages`.
- Composer: multi-line, 2000 characters, Send; stays above the keyboard; on failure keeps the text and says why.
- Empty chat prompt. Owner: "Say hi and tell Maya where and when to pick up the crib. Share the exact address here, not in the listing." Recipient: "The crib is yours! Say thanks and agree on a time."
- `conversations.markRead` on open and when new messages arrive while open.
- Menu, owner: Mark picked up, Un-pick Maya, Report, Block. Recipient: I can't take it, Report, Block.
- The chat stays open after the item is picked up. It closes only when the pick falls through (un-pick, withdraw, removal, block).
- Closed chat: composer replaced by "This chat has ended." History stays readable for good, except between people who have blocked each other (spec: block hides messages both ways).
- Text only: no photos, edits, deletes, typing indicators or read receipts.

### R5. Finding a chat
- No inbox or Messages tab (navigation is Browse · Give · My stuff). Chats open from My stuff rows, item detail and, in M5, push taps.
- Ended chats stay reachable from the listing: the recipient sees "Your chat with Ellen" on item detail; the owner sees "Past chats" (one per pick, since a new pick opens a new chat) on their listing, including after it's gone or removed.

### R6. Safety
- **Block** from: chat menu, item detail (listing owner), long-press on a requester row. (Wish rows get it in M4b.) Confirm: "Block Maya? You won't see each other's listings or wishes, and can't message. Anything you're arranging together is cancelled. Maya isn't told."
- **Report** from: chat menu (the person), long-press a message (that message), item detail (the listing). Wishes in M4b. Sheet with reasons: Spam or scam, Unsafe or offensive, Item isn't as described, Didn't show up, Something else, plus an optional note → `safety.report`. Thanks screen: "Thanks. We'll take a look."
- **Blocked people** on You, with Unblock (`safety.blocked`, `safety.unblock`).
- What the blocked person sees: the chat ends with the same neutral "This chat has ended." Nothing mentions a block.

### R7. Small backend additions
- `items.get` returns the open `conversationId` to the owner and the chosen requester (needed for "Message Ellen").
- Owner view of requests in line while pending (forItem already returns open + selected; confirm UI shape only).
- `items.get` also returns the viewer's past chats for that item (owner: all; requester: their own), minus blocked people, and keeps ended items visible to the people who had a chat about them.
- My stuff: ended rows carry their `conversationId`.
- Tests for anything added, allowed and denied cases.

## Decisions (2026-10-24)

- R1 uses design v2b: choose one person, then a single Give button, then the confirm sheet that explains the private chat.

- Wishes are their own milestone, M4b (below). M4 covers public listings only.
- Closed chats stay readable for good, from the listing and My stuff (not between blocked people).
- Reports use a reason list plus an optional note.
- "Who asked" lives on the listing, under the status card.

## Proposed defaults (say if any are wrong)
- Branch `m4-threads` off `m3-post-browse` (M3 isn't merged to main yet; uncommitted changes in CLAUDE.md, app.json, eas.json, package files are left alone).
- Build order, one commit per row: R7 backend → R4 chat → R1/R2 owner → R3 requester → R5 past chats → R6 safety.
- No push in M4. Each message already writes an `events` row; batching message pushes is an M5 question.
- Zip change UI is already live, so the "can land in M4" note in M1 is done.

## M4b. Wishes on real data (next, not part of M4)

Done when: post, browse, offer, the wisher picks, chat, picked up → wish fulfilled, all on Convex; block and report on wish rows; mock wish data deleted.

### W1. Wishes on real data
- Browse › Wishes: `wishlist.browse` (respecting the circle filter) and `wishlist.mine` for "My wishes". Search filters the loaded wishes on the device (the backend has no wish search; fine at one circle's scale).
- Add wish sheet: your real circles, all selected by default → `wishlist.create`.
- Wish rows: "I have this" (Blush pill) opens the fulfill flow; it becomes "You offered" once `myOfferId` is set.
- Give tab strip: open wishes from your circles that aren't yours and you haven't offered on.
- Fulfill flow (photo, details, send) → upload photos, `wishlist.offer`. **Sent screen copy changes** to match "offers accumulate": "Offer sent. Maya will see it with any other offers and pick one. If it's yours, a chat opens." No "Open chat" button.

### W2. The wish screen (wisher, new `app/wish/[id].tsx`)
- Wish title and note, circles, then **Offers**: photo(s), title, description, "From Sam".
- Each offer: **Take this one** (Poppy) → `wishlist.pickOffer` → open chat.
- Once one is picked: it sits on top with "Message Sam"; the others wait, with "You can pick another if this falls through." The wisher can back out ("I can't take it" → `requests.withdraw`).
- Quiet **Remove wish** link; confirm says offerers will be told.
- My stuff › Getting wish rows open this screen.

### W3. Offers from the offerer's side
- My stuff › Giving offer rows open the offer on item detail in an owner view that says "Offered for Maya's wish. Maya picks from the offers." No Share or Edit circles; Remove (withdraw offer) stays.
- Once picked: same as M4 R2 (Message, Un-pick, Mark picked up). Picked up fulfills the wish and removes the other offers; un-pick puts the offer back so the wisher can pick again (spec "Wish offers" step 4).

