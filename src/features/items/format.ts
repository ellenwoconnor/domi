import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";

/** An item as the app gets it from Convex (items.get / browse / search). */
export type ItemView = FunctionReturnType<typeof api.items.get>;
/** A circle I'm in (communities.mine). */
export type CircleView = FunctionReturnType<typeof api.communities.mine>[number];

export function circleLabel(c: { name: string; emoji?: string | null }) {
  return c.emoji ? `${c.emoji} ${c.name}` : c.name;
}

export function postedLabel(createdAt: number, now = Date.now()) {
  const hours = Math.floor((now - createdAt) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

type Point = { approxLat: number; approxLng: number };

/** Straight-line miles between two rounded locations. */
export function milesBetween(a: Point, b: Point) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.approxLat - a.approxLat);
  const dLng = rad(b.approxLng - a.approxLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.approxLat)) * Math.cos(rad(b.approxLat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

/** "0.4 mi", "12 mi", or "nearby" when the rounded points are about the same. */
export function distanceLabel(from: Point | null | undefined, to: Point) {
  if (!from) return null;
  const mi = milesBetween(from, to);
  if (mi < 0.1) return "nearby";
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}
