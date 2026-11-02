// A small list of words and phrases Domi refuses in anything people post
// (listings, wishes, notes, chat, names, circles). App Review asks for "a
// method for filtering objectionable material from being posted" (1.2); this
// plus report and block is ours.
//
// Kept deliberately narrow: slurs, explicit sexual terms and self-harm taunts.
// Everyday words that are also slang ("cock" for a rooster figurine, "hoe",
// "balls", "Dick" as a name, "spic" in Spic and Span, "chink" in a glass) are left out, because a false positive on a
// giveaway is worse than a miss the report button catches. Add words here;
// matching is whole-word, case-insensitive, after the substitutions below.

const WORDS = [
  // slurs
  "nigger", "niggers", "nigga", "niggas", "sandnigger",
  "faggot", "faggots", "fag", "fags",
  "kike", "kikes", "spics", "gook", "gooks",
  "wetback", "wetbacks", "beaner", "beaners", "raghead", "ragheads", "towelhead", "towelheads",
  "tranny", "trannies", "retard", "retards",
  "cunt", "cunts", "whore", "whores", "slut", "sluts",
  // explicit
  "porn", "porno", "nudes", "blowjob", "blowjobs", "handjob", "handjobs", "cumshot", "gangbang",
  // self-harm taunts
  "kys",
];

const PHRASES = ["kill yourself"];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

const wordSet = new Set(WORDS);

/** Lowercase, strip accents, undo common letter swaps, collapse to space-separated words. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[013457@$!]/g, (c) => LEET[c])
    .replace(/[^a-z]+/g, " ")
    .trim();
}

export function containsBlockedWord(text: string): boolean {
  const norm = normalize(text);
  if (!norm) return false;
  if (norm.split(" ").some((w) => wordSet.has(w))) return true;
  const padded = ` ${norm} `;
  return PHRASES.some((p) => padded.includes(` ${p} `));
}
