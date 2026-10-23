import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { circle, doc, invite, newUser, post, setup } from "./lib/testing.helpers";

describe("circles and invites (M2)", () => {
  test("creator owns the circle; only members can see it", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const sam = await newUser(t, "Sam");
    const shower = await circle(ellen);
    expect(await ellen.as.query(api.communities.get, { communityId: shower })).toMatchObject({
      role: "owner",
      memberCount: 1,
    });
    await expect(sam.as.query(api.communities.get, { communityId: shower })).rejects.toThrow("not in this circle");
    await expect(sam.as.query(api.communities.members, { communityId: shower })).rejects.toThrow();
  });

  test("any member can invite with their own link; preview works signed out", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const sam = await newUser(t, "Sam");
    const maya = await newUser(t, "Maya");
    const shower = await circle(ellen);
    await invite(ellen, sam, shower);
    const samsCode = await sam.as.mutation(api.invites.getOrCreate, { communityId: shower });
    expect(samsCode).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(samsCode).not.toBe(await ellen.as.query(api.invites.mine, { communityId: shower }));

    const preview = await t.query(api.invites.preview, { code: samsCode.slice(0, 4) + "-" + samsCode.slice(4) });
    expect(preview).toMatchObject({ name: "Baby Shower", emoji: "🍼", memberCount: 2, invitedBy: "Sam" });

    await maya.as.mutation(api.invites.redeem, { code: samsCode });
    const members = await maya.as.query(api.communities.members, { communityId: shower });
    expect(members.map((m) => m.displayName)).toEqual(["Ellen", "Sam", "Maya"]);
  });

  test("a returning user who signs in after tapping a link gets the saved codes redeemed", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya", { zip: "94705" }); // already has an account
    const shower = await circle(ellen);
    const code = await ellen.as.mutation(api.invites.getOrCreate, { communityId: shower });
    const itemId = await post(t, ellen, [ellen.zipCircle], "Lamp");
    const shareCode = await ellen.as.mutation(api.shares.getOrCreate, { itemId });

    const result = await maya.as.mutation(api.profiles.redeemSavedCodes, {
      inviteCodes: [code.toLowerCase(), "NOPENOPE"],
      shareCodes: [shareCode],
    });
    expect(result.invites.map((i) => i.result)).toEqual([
      { ok: true, communityId: shower },
      { ok: false, reason: "invalid" },
    ]);
    expect(result.shares[0].result).toEqual({ ok: true, itemId });
    expect(await maya.as.query(api.communities.get, { communityId: shower })).toMatchObject({ role: "member" });
    expect((await maya.as.query(api.items.get, { itemId })).title).toBe("Lamp");

    // Redeeming again is harmless.
    const again = await maya.as.mutation(api.profiles.redeemSavedCodes, { inviteCodes: [code], shareCodes: [] });
    expect(again.invites[0].result).toEqual({ ok: true, communityId: shower });
  });

  test("redeeming saved codes needs a profile", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const shower = await circle(ellen);
    const code = await ellen.as.mutation(api.invites.getOrCreate, { communityId: shower });
    const userId = await t.run((ctx) => ctx.db.insert("users", { name: "Nobody" }));
    const noProfile = t.withIdentity({ subject: `${userId}|session-x` });
    await expect(noProfile.mutation(api.profiles.redeemSavedCodes, { inviteCodes: [code], shareCodes: [] })).rejects.toThrow();
    await expect(t.mutation(api.profiles.redeemSavedCodes, { inviteCodes: [code], shareCodes: [] })).rejects.toThrow();
  });

  test("regenerating revokes the old link", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const sam = await newUser(t, "Sam");
    const shower = await circle(ellen);
    const old = await ellen.as.mutation(api.invites.getOrCreate, { communityId: shower });
    const fresh = await ellen.as.mutation(api.invites.regenerate, { communityId: shower });
    expect(fresh).not.toBe(old);
    expect(await t.query(api.invites.preview, { code: old })).toBeNull();
    expect(await sam.as.mutation(api.invites.redeem, { code: old })).toEqual({ ok: false, reason: "revoked" });
  });

  test("zip circles have no invites and can't be left directly", async () => {
    const t = await setup();
    const maya = await newUser(t, "Maya");
    await expect(maya.as.mutation(api.invites.getOrCreate, { communityId: maya.zipCircle })).rejects.toThrow(
      "Zip circles",
    );
    await expect(maya.as.mutation(api.communities.leave, { communityId: maya.zipCircle })).rejects.toThrow(
      "zip code",
    );
  });

  test("leaving removes listings that only lived there; ownership passes on", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const sam = await newUser(t, "Sam");
    const shower = await circle(ellen);
    await invite(ellen, sam, shower);
    const onlyHere = await post(t, ellen, [shower], "Bassinet");
    const elsewhereToo = await post(t, ellen, [shower, ellen.zipCircle], "Bouncer");
    await sam.as.mutation(api.requests.create, { itemId: onlyHere });

    expect(await ellen.as.query(api.communities.previewLeaving, { communityId: shower })).toEqual({
      listings: 1,
      requests: 0,
      wishes: 0,
    });
    await ellen.as.mutation(api.communities.leave, { communityId: shower });
    expect((await doc(t, onlyHere))?.status).toBe("removed");
    expect((await doc(t, elsewhereToo))?.status).toBe("available");
    expect(await sam.as.query(api.communities.get, { communityId: shower })).toMatchObject({
      role: "owner",
      memberCount: 1,
    });
  });

  test("the owner can remove a member, who can't rejoin by invite", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const sam = await newUser(t, "Sam");
    const maya = await newUser(t, "Maya");
    const shower = await circle(ellen);
    await invite(ellen, sam, shower);
    await invite(ellen, maya, shower);
    await expect(
      sam.as.mutation(api.communities.removeMember, { communityId: shower, userId: maya.userId }),
    ).rejects.toThrow("owner");
    await ellen.as.mutation(api.communities.removeMember, { communityId: shower, userId: sam.userId });
    const code = await maya.as.mutation(api.invites.getOrCreate, { communityId: shower });
    expect(await sam.as.mutation(api.invites.redeem, { code })).toEqual({ ok: false, reason: "banned" });
  });

  test("deleting a circle removes it and the listings that only lived there", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const sam = await newUser(t, "Sam");
    const shower = await circle(ellen);
    await invite(ellen, sam, shower);
    const samsItem = await post(t, sam, [shower], "Onesies");
    await expect(sam.as.mutation(api.communities.deleteCircle, { communityId: shower })).rejects.toThrow("owner");
    await ellen.as.mutation(api.communities.deleteCircle, { communityId: shower });
    expect((await doc(t, samsItem))?.status).toBe("removed");
    expect(await t.run((ctx) => ctx.db.get(shower))).toBeNull();
    expect((await sam.as.query(api.communities.mine, {})).map((c) => c.kind)).toEqual(["zip"]);
  });
});
