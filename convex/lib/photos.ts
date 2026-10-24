import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { fail } from "./access";
import { cleanText, LIMITS } from "./validate";

export async function checkPhotos(ctx: MutationCtx, photos: Id<"_storage">[]) {
  if (photos.length === 0) fail("Add at least one photo");
  if (photos.length > LIMITS.photosPerItem) fail(`Up to ${LIMITS.photosPerItem} photos`);
  if (new Set(photos).size !== photos.length) fail("Duplicate photo");
  for (const p of photos) {
    if (!(await ctx.db.system.get(p))) fail("Photo upload not found");
  }
}

export function itemText(title: string, description: string) {
  return {
    title: cleanText(title, "Title", LIMITS.itemTitle),
    description: cleanText(description, "Description", LIMITS.itemDescription, { required: false }),
  };
}

