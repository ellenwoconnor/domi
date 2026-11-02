import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { circle, eventsFor, newUser, post, setup } from "./lib/testing.helpers";

describe("listing share links (single use)", () => {
  test("a friend outside the circle signs up from the link and requests; the request uses the link", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen", { zip: "94610" });
    const itemId = await post(t, ellen, [ellen.zipCircle], "Table");
    const code = await ellen.as.mutation(api.shares.create, { itemId });
    expect(await ellen.as.mutation(api.shares.create, { itemId })).not.toBe(code); // a new link each time

    // Signed-out read-only page.
    const page = await t.query(api.shares.preview, { code });
    expect(page).toMatchObject({ available: true, title: "Table", ownerName: "Ellen", circleName: "📍 Oakland · 94610" });

    const maya = await newUser(t, "Maya", { zip: "94705", shareCodes: [code] });
    expect(maya.signup.shares[0].result).toEqual({ ok: true, itemId });
    expect((await maya.as.query(api.items.get, { itemId })).title).toBe("Table");
    await maya.as.mutation(api.requests.create, { itemId, note: "Perfect for our new place" });
    expect((await eventsFor(t, ellen.userId)).at(-1)?.type).toBe("request_created");

    // Owner sees where it came from; the link is now used.
    const asks = await ellen.as.query(api.requests.forItem, { itemId });
    expect(asks.map((a) => [a.requester.displayName, a.viaLink])).toEqual([["Maya", true]]);
    expect(await t.query(api.shares.preview, { code })).toEqual({ code, available: false, reason: "used", ownerName: "Ellen" });

    // It grants that one listing, not the circle.
    const other = await post(t, ellen, [ellen.zipCircle], "Lamp");
    await expect(maya.as.query(api.items.get, { itemId: other })).rejects.toThrow("not found");
  });

  test("opening doesn't use it; the first request does, and the second person is told", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const itemId = await post(t, ellen, [ellen.zipCircle], "Table");
    const code = await ellen.as.mutation(api.shares.create, { itemId });
    const maya = await newUser(t, "Maya", { zip: "94705" });
    const sam = await newUser(t, "Sam", { zip: "94705" });
    expect(await maya.as.mutation(api.shares.redeem, { code })).toEqual({ ok: true, itemId });
    expect(await sam.as.mutation(api.shares.redeem, { code })).toEqual({ ok: true, itemId });

    await sam.as.mutation(api.requests.create, { itemId });
    await expect(maya.as.mutation(api.requests.create, { itemId })).rejects.toThrow("already used. Ask Ellen");
    await expect(maya.as.query(api.items.get, { itemId })).rejects.toThrow("not found");
    const nora = await newUser(t, "Nora", { zip: "94705" });
    expect(await nora.as.mutation(api.shares.redeem, { code })).toEqual({ ok: false, reason: "used" });

    // Sam can withdraw and ask again through the same link.
    const [req] = await ellen.as.query(api.requests.forItem, { itemId });
    await sam.as.mutation(api.requests.withdraw, { requestId: req.id });
    await sam.as.mutation(api.requests.create, { itemId });
    expect((await ellen.as.query(api.requests.forItem, { itemId }))[0].viaLink).toBe(true);
  });

  test("links expire after 14 days, cap at 5 unused per listing, and close when the listing ends", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya", { zip: "94705" });
    const itemId = await post(t, ellen, [ellen.zipCircle]);

    const old = await ellen.as.mutation(api.shares.create, { itemId });
    await t.run(async (ctx) => {
      const s = await ctx.db.query("itemShares").withIndex("by_code", (q) => q.eq("code", old)).unique();
      await ctx.db.patch(s!._id, { expiresAt: Date.now() - 1 });
    });
    expect(await t.query(api.shares.preview, { code: old })).toMatchObject({ available: false, reason: "expired" });
    expect(await maya.as.mutation(api.shares.redeem, { code: old })).toEqual({ ok: false, reason: "expired" });

    const codes = [];
    for (let i = 0; i < 6; i++) codes.push(await ellen.as.mutation(api.shares.create, { itemId }));
    expect(await t.query(api.shares.preview, { code: codes[0] })).toBeNull(); // oldest revoked
    expect(await t.query(api.shares.preview, { code: codes[5] })).toMatchObject({ available: true });

    await ellen.as.mutation(api.items.remove, { itemId });
    expect(await t.query(api.shares.preview, { code: codes[5] })).toMatchObject({ available: false, reason: "gone" });
    expect(await maya.as.mutation(api.shares.redeem, { code: codes[5] })).toEqual({ ok: false, reason: "unavailable" });
  });

  test("only the owner can share; revoke closes unused links", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const itemId = await post(t, ellen, [ellen.zipCircle]);
    await expect(maya.as.mutation(api.shares.create, { itemId })).rejects.toThrow("not found");
    const code = await ellen.as.mutation(api.shares.create, { itemId });
    await ellen.as.mutation(api.shares.revoke, { itemId });
    expect(await t.query(api.shares.preview, { code })).toBeNull();
    expect(await maya.as.mutation(api.shares.redeem, { code })).toEqual({ ok: false, reason: "revoked" });
  });

  test("after pickup, the owner gets a circle nudge only for a link recipient they share no circle with", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const itemId = await post(t, ellen, [ellen.zipCircle], "Table");
    const code = await ellen.as.mutation(api.shares.create, { itemId });
    const maya = await newUser(t, "Maya", { zip: "94705", shareCodes: [code] });
    await maya.as.mutation(api.requests.create, { itemId });
    const [req] = await ellen.as.query(api.requests.forItem, { itemId });
    await ellen.as.mutation(api.items.selectRecipient, { requestId: req.id });
    expect(await ellen.as.query(api.shares.circleNudge, { itemId })).toBeNull(); // not picked up yet
    await ellen.as.mutation(api.items.markPickedUp, { itemId });
    expect(await ellen.as.query(api.shares.circleNudge, { itemId })).toEqual({ name: "Maya", hasCustomCircle: false });

    // Once they share a custom circle, no nudge.
    const family = await circle(ellen);
    const invite = await ellen.as.mutation(api.invites.getOrCreate, { communityId: family });
    await maya.as.mutation(api.invites.redeem, { code: invite });
    expect(await ellen.as.query(api.shares.circleNudge, { itemId })).toBeNull();
  });

  test("the share intro is marked seen once", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    await ellen.as.mutation(api.shares.markIntroSeen, {});
    const me = await ellen.as.query(api.profiles.me, {});
    expect(me?.profile?.shareIntroSeen).toBe(true);
  });
});
