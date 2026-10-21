import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { circle, doc, eventsFor, invite, newUser, post, setup, TERMS } from "./lib/testing.helpers";

describe("signup (M1)", () => {
  test("creates the profile and joins the zip circle", async () => {
    const t = await setup();
    const maya = await newUser(t, "Maya", { zip: "94610" });
    const me = await maya.as.query(api.profiles.me, {});
    expect(me?.needsSignup).toBe(false);
    expect(me?.profile?.zip).toBe("94610");
    const circles = await maya.as.query(api.communities.mine, {});
    expect(circles).toHaveLength(1);
    expect(circles[0]).toMatchObject({ kind: "zip", name: "Oakland · 94610", memberCount: 1 });
  });

  test("location comes from the zip centroid when no pin is given, rounded", async () => {
    const t = await setup();
    const maya = await newUser(t, "Maya");
    const me = await maya.as.query(api.profiles.me, {});
    expect(me?.profile?.approxLat).toBe(37.812);
  });

  test("a pin is rounded to 3 decimals", async () => {
    const t = await setup();
    const userId = await t.run((ctx) => ctx.db.insert("users", {}));
    const as = t.withIdentity({ subject: `${userId}|s` });
    await as.mutation(api.profiles.completeSignup, {
      displayName: "Sam",
      zip: "94610",
      lat: 37.8123456,
      lng: -122.2439876,
      termsVersion: TERMS,
    });
    const me = await as.query(api.profiles.me, {});
    expect(me?.profile).toMatchObject({ approxLat: 37.812, approxLng: -122.244 });
  });

  test("signed-in user without a profile needs signup and can't use the app", async () => {
    const t = await setup();
    const userId = await t.run((ctx) => ctx.db.insert("users", {}));
    const as = t.withIdentity({ subject: `${userId}|s` });
    expect((await as.query(api.profiles.me, {}))?.needsSignup).toBe(true);
    await expect(as.query(api.communities.mine, {})).rejects.toThrow("Finish signing up");
  });

  test("signed out: no access", async () => {
    const t = await setup();
    expect(await t.query(api.profiles.me, {})).toBeNull();
    await expect(t.query(api.items.browse, {})).rejects.toThrow("Not signed in");
  });

  test("requires the current terms, a known zip, and only once", async () => {
    const t = await setup();
    const userId = await t.run((ctx) => ctx.db.insert("users", {}));
    const as = t.withIdentity({ subject: `${userId}|s` });
    const base = { displayName: "Sam", zip: "94610", termsVersion: TERMS };
    await expect(as.mutation(api.profiles.completeSignup, { ...base, termsVersion: "old" })).rejects.toThrow("terms");
    await expect(as.mutation(api.profiles.completeSignup, { ...base, zip: "00000" })).rejects.toThrow("zip");
    await expect(as.mutation(api.profiles.completeSignup, { ...base, zip: "9461" })).rejects.toThrow("5-digit");
    await as.mutation(api.profiles.completeSignup, base);
    await expect(as.mutation(api.profiles.completeSignup, base)).rejects.toThrow("already");
  });

  test("invite codes saved before signup are redeemed, and the inviter hears about it", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const shower = await circle(ellen);
    const code = await ellen.as.mutation(api.invites.getOrCreate, { communityId: shower });
    const sam = await newUser(t, "Sam", { zip: "94110", inviteCodes: [code.toLowerCase(), "BADCODE1"] });
    expect(sam.signup.invites[0].result.ok).toBe(true);
    expect(sam.signup.invites[1].result.ok).toBe(false);
    const names = (await sam.as.query(api.communities.mine, {})).map((c) => c.name);
    expect(names).toEqual(["San Francisco · 94110", "Baby Shower"]);
    const events = await eventsFor(t, ellen.userId);
    expect(events.map((e) => e.body)).toContain("Sam joined 🍼 Baby Shower");
  });
});

describe("zip change", () => {
  test("preview lists what will be cancelled; change cleans up only the old zip circle", async () => {
    const t = await setup();
    const maya = await newUser(t, "Maya", { zip: "94610" });
    const ellen = await newUser(t, "Ellen", { zip: "94610" });
    const shower = await circle(ellen);
    await invite(ellen, maya, shower);

    const onlyZip = await post(t, maya, [maya.zipCircle], "Lamp");
    const both = await post(t, maya, [maya.zipCircle, shower], "Chair");
    const ellensZipItem = await post(t, ellen, [ellen.zipCircle], "Crib");
    const ellensShowerItem = await post(t, ellen, [shower], "Stroller");
    const r1 = await maya.as.mutation(api.requests.create, { itemId: ellensZipItem });
    const r2 = await maya.as.mutation(api.requests.create, { itemId: ellensShowerItem });
    // Maya is picked for the crib, so leaving the zip frees it.
    await ellen.as.mutation(api.items.selectRecipient, { requestId: r1 });

    const preview = await maya.as.query(api.profiles.previewZipChange, { zip: "94110" });
    expect(preview).toMatchObject({ oldZip: "94610", newZip: "94110", listings: 1, requests: 1, wishes: 0 });

    await maya.as.mutation(api.profiles.changeZip, { zip: "94110" });
    expect((await doc(t, onlyZip))?.status).toBe("removed");
    expect((await doc(t, both))?.status).toBe("available");
    expect((await doc(t, r1))?.status).toBe("withdrawn");
    expect((await doc(t, ellensZipItem))?.status).toBe("available");
    expect((await doc(t, r2))?.status).toBe("open"); // custom circle unaffected
    expect((await eventsFor(t, ellen.userId)).map((e) => e.type)).toContain("recipient_withdrew");

    const circles = (await maya.as.query(api.communities.mine, {})).map((c) => c.name);
    expect(circles).toEqual(["San Francisco · 94110", "Baby Shower"]);
  });
});

describe("account deletion", () => {
  test("removes the user's data, frees items they were picked for, and deletes shared threads", async () => {
    const t = await setup();
    const maya = await newUser(t, "Maya");
    const ellen = await newUser(t, "Ellen");
    const crib = await post(t, ellen, [ellen.zipCircle], "Crib");
    const mine = await post(t, maya, [maya.zipCircle], "Lamp");
    const ellensRequest = await ellen.as.mutation(api.requests.create, { itemId: mine });
    const r = await maya.as.mutation(api.requests.create, { itemId: crib });
    const conv = await ellen.as.mutation(api.items.selectRecipient, { requestId: r });
    await maya.as.mutation(api.conversations.send, { conversationId: conv, body: "Hi!" });

    await maya.as.mutation(api.profiles.deleteAccount, {});

    expect(await t.run((ctx) => ctx.db.get(maya.userId))).toBeNull();
    expect(await doc(t, mine)).toBeNull();
    expect(await doc(t, conv)).toBeNull();
    expect((await doc(t, crib))?.status).toBe("available");
    expect((await doc(t, ellensRequest))).toBeNull(); // requests on deleted items go too
    const ellenEvents = await eventsFor(t, ellen.userId);
    expect(ellenEvents.map((e) => e.type)).toEqual(
      expect.arrayContaining(["recipient_withdrew", "item_removed"]),
    );
    expect(ellenEvents.every((e) => e.actorId !== maya.userId)).toBe(true);
    const leftovers = await t.run(async (ctx) => ({
      profiles: await ctx.db.query("profiles").collect(),
      memberships: await ctx.db.query("memberships").collect(),
      messages: await ctx.db.query("messages").collect(),
    }));
    expect(leftovers.profiles).toHaveLength(1);
    expect(leftovers.memberships).toHaveLength(1);
    expect(leftovers.messages).toHaveLength(0);
  });
});
