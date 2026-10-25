import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { fail } from "./access";
import { cleanText, LIMITS } from "./validate";

// Each listing photo is stored twice: the full photo (1,600 px, item detail
// only) and a small thumbnail (~400 px) for feeds and lists. `thumbs` lines up
// with `photos` by index. Older listings and older app versions have no thumbs;
// they fall back to the full photo.

async function checkFile(ctx: MutationCtx, id: Id<"_storage">, maxBytes: number) {
  const file = await ctx.db.system.get(id);
  if (!file) fail("Photo upload not found");
  if (file.contentType !== undefined && !file.contentType.startsWith("image/")) fail("That file isn't a photo");
  if (file.size > maxBytes) fail("That photo is too large");
}

export async function checkPhotos(ctx: MutationCtx, photos: Id<"_storage">[], thumbs?: Id<"_storage">[]) {
  if (photos.length === 0) fail("Add at least one photo");
  if (photos.length > LIMITS.photosPerItem) fail(`Up to ${LIMITS.photosPerItem} photos`);
  if (new Set(photos).size !== photos.length) fail("Duplicate photo");
  for (const p of photos) await checkFile(ctx, p, LIMITS.photoMaxBytes);
  if (thumbs === undefined) return;
  if (thumbs.length !== photos.length) fail("Each photo needs one thumbnail");
  const all = new Set([...photos, ...thumbs]);
  if (all.size !== photos.length * 2) fail("Duplicate photo");
  for (const t of thumbs) await checkFile(ctx, t, LIMITS.thumbMaxBytes);
}

/** Every stored file an item holds (photos and thumbnails). */
export function itemFiles(item: Pick<Doc<"items">, "photos" | "thumbs">): Id<"_storage">[] {
  return [...item.photos, ...(item.thumbs ?? [])];
}

/** Deletes stored files, skipping any that are already gone. */
export async function deleteFiles(ctx: MutationCtx, ids: Id<"_storage">[]) {
  for (const id of ids) {
    if (await ctx.db.system.get(id)) await ctx.storage.delete(id);
  }
}

export function itemText(title: string, description: string) {
  return {
    title: cleanText(title, "Title", LIMITS.itemTitle),
    description: cleanText(description, "Description", LIMITS.itemDescription, { required: false }),
  };
}
