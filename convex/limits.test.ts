import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import { circle, invite, newUser, photo, post, setup } from "./lib/testing.helpers";
import { MAX_CIRCLES } from "./lib/circles";
import { RATE_LIMITS } from "./lib/rateLimit";

// M6 abuse and cost limits: per-person rate limits on posting, wishes, chat
// and code redemption, and the cap on invite-only circles per person.

afterEach(() => {
  vi.useRealTimers();
});

describe("posting limit", () => {
  test("listings, reposts and offers share a daily limit per person", async () => {
    const t = await setup();
    const ana = await newUser(t, "Ana");
    const ben = await newUser(t, "Ben");
    const first = await post(t, ana, [ana.zipCircle], "Item 0");
    for (let i = 1; i < RATE_LIMITS.post.max; i++) await post(t, ana, [ana.zipCircle], `Item ${i}`);

    await expect(post(t, ana, [ana.zipCircle], "One more")).rejects.toThrow("try again tomorrow");

    await t.run((ctx) => ctx.db.patch(first, { status: "expired" }));
    await expect(ana.as.mutation(api.items.repost, { itemId: first })).rejects.toThrow("try again tomorrow");

    const wishId = await ben.as.mutation(api.wishlist.create, { title: "Stroller", communityIds: [ben.zipCircle] });
    await expect(
      ana.as.mutation(api.wishlist.offer, { wishId, title: "Stroller", description: "", photos: [await photo(t)] }),
    ).rejects.toThrow("try again tomorrow");

    await post(t, ben, [ben.zipCircle]); // others aren't affected
  });

  test("the limit resets after a day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
    const t = await setup();
    const ana = await newUser(t, "Ana");
    for (let i = 0; i < RATE_LIMITS.post.max; i++) await post(t, ana, [ana.zipCircle], `Item ${i}`);
    await expect(post(t, ana, [ana.zipCircle])).rejects.toThrow("try again tomorrow");
    vi.setSystemTime(new Date("2026-11-02T12:00:01Z"));
    await post(t, ana, [ana.zipCircle]);
  });
});

describe("wish limit", () => {
  test("new wishes are limited per day", async () => {
    const t = await setup();
    const ana = await newUser(t, "Ana");
    for (let i = 0; i < RATE_LIMITS.wish.max; i++) {
      await ana.as.mutation(api.wishlist.create, { title: `Wish ${i}`, communityIds: [ana.zipCircle] });
    }
    await expect(
      ana.as.mutation(api.wishlist.create, { title: "One more", communityIds: [ana.zipCircle] }),
    ).rejects.toThrow("try again tomorrow");
  });
});

describe("chat limit", () => {
  test("messages are limited per minute per sender", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const itemId = await post(t, ellen, [ellen.zipCircle]);
    const requestId = await maya.as.mutation(api.requests.create, { itemId });
    const conversationId = await ellen.as.mutation(api.items.selectRecipient, { requestId });

    for (let i = 0; i < RATE_LIMITS.message.max; i++) {
      await maya.as.mutation(api.conversations.send, { conversationId, body: `hi ${i}` });
    }
    await expect(maya.as.mutation(api.conversations.send, { conversationId, body: "hi" })).rejects.toThrow(
      "wait a moment",
    );
    await ellen.as.mutation(api.conversations.send, { conversationId, body: "slow down!" }); // the other side can still reply
  });
});

describe("code redemption limit", () => {
  test("invite and share codes share an hourly limit", async () => {
    const t = await setup();
    const ana = await newUser(t, "Ana");
    for (let i = 0; i < RATE_LIMITS.redeem.max / 2; i++) {
      expect(await ana.as.mutation(api.invites.redeem, { code: "ZZZZZZZZ" })).toEqual({ ok: false, reason: "invalid" });
      expect(await ana.as.mutation(api.shares.redeem, { code: "ZZZZZZZZ" })).toEqual({ ok: false, reason: "invalid" });
    }
    await expect(ana.as.mutation(api.invites.redeem, { code: "ZZZZZZZZ" })).rejects.toThrow("Too many codes");
    await expect(ana.as.mutation(api.shares.redeem, { code: "ZZZZZZZZ" })).rejects.toThrow("Too many codes");
  });
});

describe("circles per person", () => {
  test(`a person can be in at most ${MAX_CIRCLES} invite-only circles; the home circle doesn't count`, async () => {
    const t = await setup();
    const ana = await newUser(t, "Ana");
    const ben = await newUser(t, "Ben");
    const circles = [];
    for (let i = 0; i < MAX_CIRCLES; i++) circles.push(await circle(ana, `Circle ${i}`));

    await expect(circle(ana, "One more")).rejects.toThrow(`You're in ${MAX_CIRCLES} circles`);

    const bens = await circle(ben, "Ben's circle");
    const code = await ben.as.mutation(api.invites.getOrCreate, { communityId: bens });
    expect(await ana.as.mutation(api.invites.redeem, { code })).toEqual({ ok: false, reason: "too_many_circles" });

    // Already a member: redeeming again is still fine at the cap.
    await invite(ana, ben, circles[0]);
    const anasCode = await ana.as.mutation(api.invites.getOrCreate, { communityId: circles[0] });
    expect((await ana.as.mutation(api.invites.redeem, { code: anasCode })).ok).toBe(true);

    // Leaving one makes room.
    await ana.as.mutation(api.communities.leave, { communityId: circles[1] });
    expect(await ana.as.mutation(api.invites.redeem, { code })).toEqual({ ok: true, communityId: bens });
  });

  test("saved codes redeemed at sign-in report the cap instead of failing", async () => {
    const t = await setup();
    const ana = await newUser(t, "Ana");
    const ben = await newUser(t, "Ben");
    for (let i = 0; i < MAX_CIRCLES; i++) await circle(ana, `Circle ${i}`);
    const bens = await circle(ben, "Ben's circle");
    const code = await ben.as.mutation(api.invites.getOrCreate, { communityId: bens });
    const result = await ana.as.mutation(api.profiles.redeemSavedCodes, { inviteCodes: [code], shareCodes: [] });
    expect(result.invites).toEqual([{ code, result: { ok: false, reason: "too_many_circles" } }]);
  });
});
