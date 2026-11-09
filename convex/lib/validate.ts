import { fail } from "./access";
import { containsBlockedWord } from "./blockedWords";

// Shared input rules. Client ids are never trusted; these only shape text.

export const LIMITS = {
  displayName: 40,
  circleName: 40,
  circleDescription: 280,
  itemTitle: 80,
  itemDescription: 1000,
  wishTitle: 80,
  wishDescription: 1000, // same as listings (2026-11-08)
  requestNote: 140,
  thankNote: 140,
  declineNote: 140,
  message: 2000,
  reportReason: 1000,
  photosPerItem: 3,
  openRequestsPerUser: 5,
  // Photos are compressed on the phone (full ~250 KB, thumbnail ~40 KB); these
  // leave plenty of room and stop anything else being stored.
  photoMaxBytes: 2_000_000,
  thumbMaxBytes: 300_000,
} as const;

export const DAY_MS = 24 * 60 * 60 * 1000;
export const LISTING_LIFETIME_MS = 30 * DAY_MS;
/** One zip change per this long (the first change after signup is free). */
export const ZIP_CHANGE_COOLDOWN_MS = 30 * DAY_MS;
export const PHOTO_RETENTION_MS = 30 * DAY_MS;
/** Uploads not attached to a listing by then are deleted (maintenance.purgeOrphanUploads). */
export const ORPHAN_UPLOAD_MS = DAY_MS;

/**
 * Trims and checks length. Unless `screen` is false, refuses text with a
 * blocked word (lib/blockedWords.ts). Report reasons skip the screen, since
 * people quote what they're reporting.
 */
export function cleanText(
  value: string,
  field: string,
  max: number,
  { required = true, screen = true }: { required?: boolean; screen?: boolean } = {},
): string {
  const text = value.trim();
  if (required && text.length === 0) fail(`${field} is required`);
  if (text.length > max) fail(`${field} must be ${max} characters or fewer`);
  if (screen && containsBlockedWord(text)) fail(`${field} has language that isn't allowed on Domi`);
  return text;
}

export function cleanOptionalText(value: string | undefined, field: string, max: number): string | undefined {
  if (value === undefined) return undefined;
  const text = cleanText(value, field, max, { required: false });
  return text.length ? text : undefined;
}

export function cleanZip(zip: string): string {
  const z = zip.trim();
  if (!/^\d{5}$/.test(z)) fail("Enter a 5-digit zip code");
  return z;
}

/** Rounds to ~110 m so we never store a precise location. */
export function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function checkLatLng(lat: number, lng: number) {
  if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) fail("Invalid location");
}

export function cleanEmoji(emoji: string): string {
  const e = emoji.trim();
  // One emoji may be several code points (flags, skin tones, ZWJ sequences).
  if (e.length === 0 || [...e].length > 8) fail("Pick one emoji");
  return e;
}
