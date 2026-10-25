import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { doc, newUser, photo, setup, type T } from "./lib/testing.helpers";
import { RATE_LIMITS } from "./lib/rateLimit";
import { DAY_MS, LIMITS } from "./lib/validate";

// Cost controls: thumbnails, upload checks, orphan cleanup, upload rate limit.

const store = (t: T, bytes: number) =>
  t.run((ctx) => ctx.storage.store(new Blob([new Uint8Array(bytes)], { type: "image/jpeg" })));
const exists = (t: T, id: Id<"_storage">) => t.run(async (ctx) => (await ctx.db.system.get(id)) !== null);

describe("thumbnails", () => {
  test("feeds get the thumbnail, item detail the full photo", async () => {
    const t = await setup();
    const a = await newUser(t, "Ana");
    const full = await photo(t);
    const thumb = await photo(t);
    const itemId = await a.as.mutation(api.items.create, {
      title: "Crib",
      description: "",
      photos: [full],
      thumbs: [thumb],
      communityIds: [a.zipCircle],
    });
    const view = await a.as.query(api.items.get, { itemId });
    const [fullUrl, thumbUrl] = await t.run(async (ctx) => [await ctx.storage.getUrl(full), await ctx.storage.getUrl(thumb)]);
    expect(view.photoUrls).toEqual([fullUrl]);
    expect(view.thumbUrls).toEqual([thumbUrl]);
    expect(view.ownerPhotos).toEqual([{ storageId: full, thumbId: thumb, url: fullUrl }]);
  });

  test("listings without thumbnails fall back to the full photo", async () => {
    const t = await setup();
    const a = await newUser(t, "Ana");
    const full = await photo(t);
    const itemId = await a.as.mutation(api.items.create, { title: "Crib", description: "", photos: [full], communityIds: [a.zipCircle] });
    const view = await a.as.query(api.items.get, { itemId });
    expect(view.thumbUrls).toEqual(view.photoUrls);
  });

  test("thumbnails must line up with photos", async () => {
    const t = await setup();
    const a = await newUser(t, "Ana");
    const p = await photo(t);
    const base = { title: "Crib", description: "", communityIds: [a.zipCircle] };
    await expect(a.as.mutation(api.items.create, { ...base, photos: [p], thumbs: [] })).rejects.toThrow("thumbnail");
    await expect(a.as.mutation(api.items.create, { ...base, photos: [p], thumbs: [p] })).rejects.toThrow("Duplicate");
  });

  test("editing photos deletes the replaced photo and its thumbnail", async () => {
    const t = await setup();
    const a = await newUser(t, "Ana");
    const [p1, t1, p2, t2] = [await photo(t), await photo(t), await photo(t), await photo(t)];
    const itemId = await a.as.mutation(api.items.create, { title: "Crib", description: "", photos: [p1], thumbs: [t1], communityIds: [a.zipCircle] });
    await a.as.mutation(api.items.update, { itemId, photos: [p2], thumbs: [t2] });
    expect(await exists(t, p1)).toBe(false);
    expect(await exists(t, t1)).toBe(false);
    expect((await doc(t, itemId))?.thumbs).toEqual([t2]);
  });

  test("ended listings lose their thumbnails too after 30 days", async () => {
    const t = await setup();
    const a = await newUser(t, "Ana");
    const [p, th] = [await photo(t), await photo(t)];
    const itemId = await a.as.mutation(api.items.create, { title: "Crib", description: "", photos: [p], thumbs: [th], communityIds: [a.zipCircle] });
    await a.as.mutation(api.items.remove, { itemId });
    await t.run((ctx) => ctx.db.patch(itemId, { updatedAt: Date.now() - 31 * DAY_MS }));
    expect(await t.mutation(internal.maintenance.purgeEndedPhotos, {})).toBe(1);
    expect(await exists(t, th)).toBe(false);
    expect(await t.mutation(internal.maintenance.purgeEndedPhotos, {})).toBe(0); // already purged ones aren't picked again
  });
});

describe("upload checks", () => {
  test("rejects photos that are too large or aren't images", async () => {
    const t = await setup();
    const a = await newUser(t, "Ana");
    const base = { title: "Crib", description: "", communityIds: [a.zipCircle] };
    const big = await store(t, LIMITS.photoMaxBytes + 1);
    await expect(a.as.mutation(api.items.create, { ...base, photos: [big] })).rejects.toThrow("too large");
    // (Non-image types are rejected too; convex-test doesn't record a file's type, so that's not tested here.)
    const bigThumb = await store(t, LIMITS.thumbMaxBytes + 1);
    await expect(a.as.mutation(api.items.create, { ...base, photos: [await photo(t)], thumbs: [bigThumb] })).rejects.toThrow("too large");
  });

  test("upload URLs are rate-limited per person", async () => {
    const t = await setup();
    const a = await newUser(t, "Ana");
    const b = await newUser(t, "Ben");
    for (let i = 0; i < RATE_LIMITS.uploadUrl.max; i++) await a.as.mutation(api.items.generateUploadUrl, {});
    await expect(a.as.mutation(api.items.generateUploadUrl, {})).rejects.toThrow("wait a bit");
    await b.as.mutation(api.items.generateUploadUrl, {}); // others aren't affected
  });
});

describe("orphan uploads", () => {
  test("deletes uploads over a day old that no listing uses, and keeps the rest", async () => {
    const t = await setup();
    const a = await newUser(t, "Ana");
    const orphan = await photo(t);
    const used = await photo(t);
    const usedThumb = await photo(t);
    await a.as.mutation(api.items.create, { title: "Crib", description: "", photos: [used], thumbs: [usedThumb], communityIds: [a.zipCircle] });

    // Under a day old: nothing is touched (a post may still be in progress).
    expect(await t.mutation(internal.maintenance.purgeOrphanUploads, {})).toBe(0);
    expect(await exists(t, orphan)).toBe(true);

    // Two days later: only the upload no listing uses is deleted.
    expect(await t.mutation(internal.maintenance.purgeOrphanUploads, { now: Date.now() + 2 * DAY_MS })).toBe(1);
    expect(await exists(t, orphan)).toBe(false);
    expect(await exists(t, used)).toBe(true);
    expect(await exists(t, usedThumb)).toBe(true);
  });
});
