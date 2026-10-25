// Does a new listing match a wish? Simple word matching on titles, meant to be
// tuned: all the wish's words appear in the listing title, or the other way round.
// "stroller" matches "Bugaboo stroller"; "jogging stroller" matches "Stroller".

const STOP = new Set([
  "the", "and", "for", "with", "any", "some", "kid", "kids", "baby", "size", "new", "used",
  "good", "great", "old", "small", "large", "big", "little", "set", "pair", "lot", "box",
  "looking", "need", "want", "wanted", "free", "one",
]);

export function words(s: string): Set<string> {
  const out = new Set<string>();
  for (const raw of s.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || STOP.has(raw)) continue;
    out.add(raw.replace(/(ies)$/, "y").replace(/(ses|xes|ches|shes)$/, (m) => m.slice(0, -2)).replace(/s$/, ""));
  }
  return out;
}

const within = (a: Set<string>, b: Set<string>) => a.size > 0 && [...a].every((w) => b.has(w));

export function matchesWish(itemTitle: string, wishTitle: string) {
  const item = words(itemTitle);
  const wish = words(wishTitle);
  return within(wish, item) || within(item, wish);
}
