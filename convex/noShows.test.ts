import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import { doc, eventsFor, newUser, photo, post, setup, type T, type U } from "./lib/testing.helpers";

afterEach(() => {
  vi.useRealTimers();
});

/** Owner posts, requester requests and is picked, owner marks a no-show. */
async function missedPickup(t: T, owner: U, requester: U, title = "Crib") {
  const itemId = await post(t, owner, [owner.zipCircle], title);
  const requestId = await requester.as.mutation(api.requests.create, { itemId });
  await owner.as.mutation(api.items.selectRecipient, { requestId });
  await owner.as.mutation(api.items.unpick, { itemId, noShow: true });
  return { itemId, requestId };
}

describe("missed pickups", () => {
  test("a no-show un-picks, tells the requester, and keeps the line", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const sam = await newUser(t, "Sam");
    const itemId = await post(t, ellen, [ellen.zipCircle]);
    const rMaya = await maya.as.mutation(api.requests.create, { itemId });
    const rSam = await sam.as.mutation(api.requests.create, { itemId });
    await ellen.as.mutation(api.items.selectRecipient, { requestId: rMaya });
    await ellen.as.mutation(api.items.unpick, { itemId, noShow: true });

    expect((await doc(t, itemId))?.status).toBe("available");
    expect((await doc(t, rMaya))?.status).toBe("cancelled");
    expect((await doc(t, rSam))?.status).toBe("open");
    const last = (await eventsFor(t, maya.userId)).at(-1);
    expect(last?.type).toBe("unpicked");
    expect(last?.body).toBe("Ellen cancelled this exchange.");
    const rows = await t.run((ctx) => ctx.db.query("noShows").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ requesterId: maya.userId, ownerId: ellen.userId, itemId });
  });

  test("a plain un-pick isn't a no-show", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const itemId = await post(t, ellen, [ellen.zipCircle]);
    const r = await maya.as.mutation(api.requests.create, { itemId });
    await ellen.as.mutation(api.items.selectRecipient, { requestId: r });
    await ellen.as.mutation(api.items.unpick, { itemId });
    expect(await t.run((ctx) => ctx.db.query("noShows").collect())).toHaveLength(0);
    expect((await eventsFor(t, maya.userId)).at(-1)?.body).toBe("Ellen cancelled this exchange.");
  });

  test("only the owner can mark a no-show", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const sam = await newUser(t, "Sam");
    const itemId = await post(t, ellen, [ellen.zipCircle]);
    const r = await maya.as.mutation(api.requests.create, { itemId });
    await ellen.as.mutation(api.items.selectRecipient, { requestId: r });
    await expect(sam.as.mutation(api.items.unpick, { itemId, noShow: true })).rejects.toThrow();
    await expect(maya.as.mutation(api.items.unpick, { itemId, noShow: true })).rejects.toThrow();
    expect(await t.run((ctx) => ctx.db.query("noShows").collect())).toHaveLength(0);
  });

  test("two no-shows with two neighbors pause requests and offer picks for 7 days", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const jo = await newUser(t, "Jo");
    const kai = await newUser(t, "Kai");
    const maya = await newUser(t, "Maya");
    await missedPickup(t, ellen, maya, "Crib");
    vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
    await missedPickup(t, jo, maya, "Lamp");

    const next = await post(t, kai, [kai.zipCircle], "Chair");
    await expect(maya.as.mutation(api.requests.create, { itemId: next })).rejects.toThrow("paused for 7 more days");
    // Wishes: picking an offer is paused too.
    const wishId = await maya.as.mutation(api.wishlist.create, { title: "Desk", communityIds: [maya.zipCircle] });
    const offerId = await kai.as.mutation(api.wishlist.offer, {
      wishId,
      title: "Desk",
      description: "Oak",
      photos: [await photo(t)],
    });
    await expect(maya.as.mutation(api.wishlist.pickOffer, { itemId: offerId })).rejects.toThrow("paused");

    // Others aren't affected.
    const sam = await newUser(t, "Sam");
    await sam.as.mutation(api.requests.create, { itemId: next });

    vi.setSystemTime(new Date("2026-11-09T12:00:00Z"));
    await expect(maya.as.mutation(api.requests.create, { itemId: next })).rejects.toThrow("paused for 1 more day");
    vi.setSystemTime(new Date("2026-11-10T12:00:01Z"));
    await maya.as.mutation(api.requests.create, { itemId: next });
  });

  test("two no-shows with the same neighbor don't pause", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const kai = await newUser(t, "Kai");
    const maya = await newUser(t, "Maya");
    await missedPickup(t, ellen, maya, "Crib");
    await missedPickup(t, ellen, maya, "Lamp");
    const next = await post(t, kai, [kai.zipCircle], "Chair");
    await maya.as.mutation(api.requests.create, { itemId: next });
  });

  test("no-shows older than 30 days don't count", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const jo = await newUser(t, "Jo");
    const kai = await newUser(t, "Kai");
    const maya = await newUser(t, "Maya");
    await missedPickup(t, ellen, maya, "Crib");
    vi.setSystemTime(new Date("2026-11-02T12:00:00Z"));
    await missedPickup(t, jo, maya, "Lamp");
    const next = await post(t, kai, [kai.zipCircle], "Chair");
    await maya.as.mutation(api.requests.create, { itemId: next });
  });

  test("deleting an account removes its no-show rows", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    await missedPickup(t, ellen, maya);
    await maya.as.mutation(api.profiles.deleteAccount, {});
    expect(await t.run((ctx) => ctx.db.query("noShows").collect())).toHaveLength(0);
  });
});

describe("zip change limit", () => {
  test("the first change is free; the next waits 30 days; moving the pin doesn't count", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
    const t = await setup();
    const maya = await newUser(t, "Maya", { zip: "94610" });
    expect((await maya.as.query(api.profiles.me, {}))?.profile?.nextZipChangeAt).toBeNull();

    await maya.as.mutation(api.profiles.changeZip, { zip: "94110" });
    const next = (await maya.as.query(api.profiles.me, {}))?.profile?.nextZipChangeAt;
    expect(next).toBe(new Date("2026-12-01T12:00:00Z").getTime());
    expect((await maya.as.query(api.profiles.previewZipChange, { zip: "94610" })).nextChangeAt).toBe(next);

    vi.setSystemTime(new Date("2026-11-02T12:00:00Z"));
    // Same zip, new pin: always allowed.
    await maya.as.mutation(api.profiles.changeZip, { zip: "94110", lat: 37.75, lng: -122.41 });
    await expect(maya.as.mutation(api.profiles.changeZip, { zip: "94610" })).rejects.toThrow(
      "You can change it again in 29 days",
    );
    expect((await maya.as.query(api.profiles.me, {}))?.profile?.zip).toBe("94110");

    vi.setSystemTime(new Date("2026-12-01T12:00:00Z"));
    await maya.as.mutation(api.profiles.changeZip, { zip: "94610" });
    expect((await maya.as.query(api.profiles.me, {}))?.profile?.zip).toBe("94610");
  });

  test("a blocked change leaves circles and requests alone", async () => {
    const t = await setup();
    const maya = await newUser(t, "Maya", { zip: "94610" });
    const ellen = await newUser(t, "Ellen", { zip: "94110" });
    await maya.as.mutation(api.profiles.changeZip, { zip: "94110" });
    const itemId = await post(t, ellen, [ellen.zipCircle]);
    const r = await maya.as.mutation(api.requests.create, { itemId });
    await expect(maya.as.mutation(api.profiles.changeZip, { zip: "94610" })).rejects.toThrow("once a month");
    expect((await doc(t, r))?.status).toBe("open");
    expect((await maya.as.query(api.communities.mine, {})).map((c) => c.name)).toEqual(["San Francisco · 94110"]);
  });
});
