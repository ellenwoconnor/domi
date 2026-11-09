// Set by the new-wish screen after a wish is posted, read once by Browse when it
// comes back into focus: it switches to Wishes, clears the search, and may ask
// to turn on notifications. Same pattern as features/auth/landing.ts.
let added = false;

export function markWishAdded() {
  added = true;
}

export function takeWishAdded() {
  const was = added;
  added = false;
  return was;
}
