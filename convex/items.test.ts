import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { circle, doc, eventsFor, invite, newUser, photo, post, setup } from "./lib/testing.helpers";
import { DAY_MS } from "./lib/validate";

describe("post and browse (M3)", () => {
  test("A posts to two circles; B in one sees it; C in neither cannot", async () => {
    const t = await setup();
    const a = await newUser(t, "Ana", { zip: "94610" });
    const b = await newUser(t, "Ben", { zip: "94110" });
    const c = await newUser(t, "Cal", { zip: "94705" });
    const shower = await circle(a);
    await invite(a, b, shower);
    const itemId = await post(t, a, [a.zipCircle, shower], "Crib");

    const bFeed = await b.as.query(api.items.browse, {});
    expect(bFeed.map((i) => i.id)).toEqual([itemId]);
    const bView = await b.as.query(api.items.get, { itemId });
    expect(bView.circles.map((x) => x.name)).toEqual(["Baby Shower"]); // only circles B is in
    expect(bView.photoUrls).toHaveLength(1);

    expect(await c.as.query(api.items.browse, {})).toEqual([]);
    await expect(c.as.query(api.items.get, { itemId })).rejects.toThrow("Item not found");
    expect(await c.as.query(api.items.search, { text: "crib" })).toEqual([]);
    expect((await b.as.query(api.items.search, { text: "crib" })).map((i) => i.id)).toEqual([itemId]);
  });

  test("can only post to circles you're in, with at least one photo", async () => {
    const t = await setup();
    const a = await newUser(t, "Ana");
    const b = await newUser(t, "Ben", { zip: "94110" });
    await expect(post(t, a, [b.zipCircle])).rejects.toThrow("not in this circle");
    await expect(
      a.as.mutation(api.items.create, { title: "X", description: "Y", photos: [], communityIds: [a.zipCircle] }),
    ).rejects.toThrow("photo");
  });

  test("only the owner can edit or remove; circles can't be dropped once requested", async () => {
    const t = await setup();
    const a = await newUser(t, "Ana");
    const b = await newUser(t, "Ben");
    const shower = await circle(a);
    const itemId = await post(t, a, [a.zipCircle, shower]);
    await expect(b.as.mutation(api.items.update, { itemId, title: "Mine now" })).rejects.toThrow("not found");
    await expect(b.as.mutation(api.items.remove, { itemId })).rejects.toThrow("not found");
    await b.as.mutation(api.requests.create, { itemId });
    await expect(
      a.as.mutation(api.items.update, { itemId, communityIds: [shower] }),
    ).rejects.toThrow("requested");
    await a.as.mutation(api.items.update, { itemId, title: "Wooden crib", photos: [await photo(t)] });
    expect((await doc(t, itemId))?.title).toBe("Wooden crib");
  });

  test("listings expire after 30 days and can be reposted with their line intact", async () => {
    const t = await setup();
    const a = await newUser(t, "Ana");
    const b = await newUser(t, "Ben");
    const itemId = await post(t, a, [a.zipCircle]);
    const r = await b.as.mutation(api.requests.create, { itemId });
    await t.run((ctx) => ctx.db.patch(itemId, { expiresAt: Date.now() - 1 }));
    await t.mutation(internal.maintenance.expireDue, {});
    expect((await doc(t, itemId))?.status).toBe("expired");
    expect((await eventsFor(t, a.userId)).map((e) => e.type)).toContain("item_expired");
    expect((await eventsFor(t, b.userId)).map((e) => e.type)).toContain("request_expired");

    await a.as.mutation(api.items.repost, { itemId });
    const item = await doc(t, itemId);
    expect(item?.status).toBe("available");
    expect(item!.expiresAt).toBeGreaterThan(Date.now() + 29 * DAY_MS);
    expect((await doc(t, r))?.status).toBe("open");
  });

  test("photos of ended listings are deleted after 30 days", async () => {
    const t = await setup();
    const a = await newUser(t, "Ana");
    const itemId = await post(t, a, [a.zipCircle]);
    await a.as.mutation(api.items.remove, { itemId });
    await t.run((ctx) => ctx.db.patch(itemId, { updatedAt: Date.now() - 31 * DAY_MS }));
    await t.mutation(internal.maintenance.purgeEndedPhotos, {});
    const item = await doc(t, itemId);
    expect(item?.photosPurgedAt).toBeDefined();
    expect(await t.run((ctx) => ctx.db.system.get(item!.photos[0]))).toBeNull();
  });
});
