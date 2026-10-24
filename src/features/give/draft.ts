import { useSyncExternalStore } from "react";
import { MAX_PHOTOS } from "./photos";

/**
 * The listing being written: photos taken on the Give tab, carried to the new
 * listing screen. Local photo URIs only; nothing is uploaded until Post.
 */
let photos: string[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const draft = {
  set(next: string[]) {
    photos = next.slice(0, MAX_PHOTOS);
    emit();
  },
  add(more: string[]) {
    draft.set([...photos, ...more]);
  },
  remove(uri: string) {
    draft.set(photos.filter((p) => p !== uri));
  },
  clear() {
    draft.set([]);
  },
};

export function useDraftPhotos() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => photos,
  );
}
