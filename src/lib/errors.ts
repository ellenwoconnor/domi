import { ConvexError } from "convex/values";

/**
 * The message to show for a failed Convex call. Backend checks throw
 * ConvexError("…") with copy meant for people; anything else is unexpected.
 */
export function errorMessage(e: unknown, fallback = "Something went wrong. Try again."): string {
  if (e instanceof ConvexError && typeof e.data === "string") return e.data;
  // In development builds, show what actually went wrong.
  if (__DEV__) return `${fallback}\n\n[dev] ${e instanceof Error ? e.message : String(e)}`;
  return fallback;
}
