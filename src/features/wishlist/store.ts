import { useSyncExternalStore } from "react";

// Mock wishlist store for the design preview (in-memory, resets on reload).
// Replaced by Convex queries/mutations when wishlists are built.

export type Wish = {
  id: string;
  title: string;
  note?: string; // the person's own words, up to 140 characters
  who: string; // "You" for your own wishes
  area: string;
  circleIds: string[];
  postedHoursAgo: number;
  mine: boolean;
  emoji: string; // stands in for the photo the giver takes, in the mock only
  status: "open" | "claimed"; // claimed = someone tapped "I have this"
};

let wishes: Wish[] = [
  {
    id: "w-mine-1",
    title: "Kids' bike helmet",
    note: "Small, for a 3 year old who just got a balance bike.",
    who: "You",
    area: "Kensington",
    circleIds: ["home", "baby"],
    postedHoursAgo: 50,
    mine: true,
    emoji: "⛑️",
    status: "open",
  },
  {
    id: "w-sam",
    title: "Toddler rain boots, size 8",
    note: "For the walk to school. Puddles included.",
    who: "Sam",
    area: "Thousand Oaks",
    circleIds: ["home", "baby"],
    postedHoursAgo: 3,
    mine: false,
    emoji: "🥾",
    status: "open",
  },
  {
    id: "w-priya",
    title: "Bike trailer",
    note: "For Saturday farmers market runs with two small kids.",
    who: "Priya",
    area: "Spruce St",
    circleIds: ["spruce"],
    postedHoursAgo: 8,
    mine: false,
    emoji: "🚲",
    status: "open",
  },
  {
    id: "w-maya",
    title: "Pack-n-play",
    note: "Grandparents visiting for the holidays.",
    who: "Maya",
    area: "El Cerrito Hills",
    circleIds: ["baby"],
    postedHoursAgo: 20,
    mine: false,
    emoji: "🧸",
    status: "open",
  },
  {
    id: "w-alex",
    title: "Folding table",
    note: "Block party on Spruce in November.",
    who: "Alex",
    area: "Westbrae",
    circleIds: ["home", "spruce"],
    postedHoursAgo: 30,
    mine: false,
    emoji: "🪑",
    status: "open",
  },
  {
    id: "w-jordan",
    title: "Picture books in Spanish",
    who: "Jordan",
    area: "Kensington",
    circleIds: ["baby"],
    postedHoursAgo: 75,
    mine: false,
    emoji: "📖",
    status: "open",
  },
];

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useWishes() {
  return useSyncExternalStore(subscribe, () => wishes, () => wishes);
}

export function getWish(id: string) {
  return wishes.find((w) => w.id === id);
}

export function addWish(input: { title: string; note?: string; circleIds: string[] }) {
  wishes = [
    {
      id: `w-${Date.now()}`,
      title: input.title,
      note: input.note || undefined,
      who: "You",
      area: "Kensington",
      circleIds: input.circleIds,
      postedHoursAgo: 0,
      mine: true,
      emoji: "🎁",
      status: "open",
    },
    ...wishes,
  ];
  emit();
}

export function removeWish(id: string) {
  wishes = wishes.filter((w) => w.id !== id);
  emit();
}

/** Someone tapped "I have this": hide it from everyone else so two neighbors don't both fulfill it. */
export function claimWish(id: string) {
  wishes = wishes.map((w) => (w.id === id ? { ...w, status: "claimed" } : w));
  emit();
}
