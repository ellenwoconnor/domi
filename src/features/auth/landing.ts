import type { Id } from "../../../convex/_generated/dataModel";

// After signup from a listing share link, open that listing instead of Browse.
// Set by onboarding, read once by the tabs layout (which then shows the
// "How Domi works" cards on top, so closing them lands on the listing).
let landingItem: Id<"items"> | null = null;

export function setLandingItem(id: Id<"items"> | null) {
  landingItem = id;
}

export function takeLandingItem() {
  const id = landingItem;
  landingItem = null;
  return id;
}
